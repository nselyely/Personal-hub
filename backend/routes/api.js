import { Router } from "express";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import pool from "../config/database.js";

const router = Router();
const scrypt = promisify(scryptCallback);
const uploadDirectory = fileURLToPath(new URL("../uploads/", import.meta.url));
const sessionCookie = "personalhub_session";
const sessionDuration = 7 * 24 * 60 * 60;
const allowedImageTypes = {
  "image/jpeg": { extension: "jpg", signature: (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff },
  "image/png": { extension: "png", signature: (data) => data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/gif": { extension: "gif", signature: (data) => data.subarray(0, 3).toString() === "GIF" },
  "image/webp": { extension: "webp", signature: (data) => data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP" },
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

function route(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function requireValue(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new HttpError(400, `${label} is required and must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function normalizeEmail(value) {
  const email = requireValue(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  return email;
}

function passwordValue(value) {
  if (typeof value !== "string" || value.length < 10 || value.length > 128) {
    throw new HttpError(400, "Password must be between 10 and 128 characters.");
  }
  return value;
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, encoded) {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltHex, keyHex] = parts;
  if (n !== "16384" || r !== "8" || p !== "1" || !/^[a-f0-9]{32}$/.test(saltHex) || !/^[a-f0-9]{128}$/.test(keyHex)) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(expected, actual);
}

async function createSession(database, userId) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await database.execute(
    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))",
    [userId, tokenHash],
  );
  return token;
}

function setSessionCookie(response, token) {
  response.cookie(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDuration * 1000,
  });
}

function clearSessionCookie(response) {
  response.clearCookie(sessionCookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
}

function readCookie(request, name) {
  const cookies = request.headers.cookie || "";
  const prefix = `${name}=`;
  const entry = cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

async function currentUser(request) {
  const token = readCookie(request, sessionCookie);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [rows] = await pool.execute(
    "SELECT u.id, u.full_name AS fullName, u.email, u.role, p.visibility AS profileVisibility, p.profile_image_path AS profileImagePath FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN personal_profiles p ON p.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.status = 'approved' LIMIT 1",
    [tokenHash],
  );
  return rows[0] ? { ...rows[0], image: imageUrl(rows[0].profileImagePath) } : null;
}

async function authenticatedUser(request) {
  const user = await currentUser(request);
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  return user;
}

function requireRole(user, roles) {
  if (!roles.includes(user.role)) throw new HttpError(403, "You do not have permission to perform this action.");
}

function publicUser(user) {
  return { id: user.id, fullName: user.fullName, email: user.email, role: user.role, image: user.image || null };
}

async function familyAvatar(userId) {
  const [rows] = await pool.execute(
    "SELECT profile_image_path AS imagePath, visibility FROM personal_profiles WHERE user_id = ? LIMIT 1",
    [userId],
  );
  return rows[0]?.visibility === "private" ? null : imageUrl(rows[0]?.imagePath);
}

function imageBuffer(dataUrl) {
  if (dataUrl == null || dataUrl === "") return null;
  if (typeof dataUrl !== "string") throw new HttpError(400, "Image data is invalid.");
  const match = /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new HttpError(400, "Upload a JPEG, PNG, GIF or WebP image.");
  const [, mimeType, encoded] = match;
  const data = Buffer.from(encoded, "base64");
  const imageType = allowedImageTypes[mimeType];
  if (data.length === 0 || data.length > 10 * 1024 * 1024 || !imageType.signature(data)) {
    throw new HttpError(400, "Image must be valid and no larger than 10 MB.");
  }
  return { data, mimeType, extension: imageType.extension };
}

async function storeImage(dataUrl) {
  const image = imageBuffer(dataUrl);
  if (!image) return null;
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `${randomUUID()}.${image.extension}`;
  await writeFile(path.join(uploadDirectory, filename), image.data, { flag: "wx" });
  return filename;
}

async function removeStoredImage(filename) {
  try {
    await unlink(path.join(uploadDirectory, filename));
  } catch (error) {
    if (error.code !== "ENOENT") console.error("Could not remove an unused upload:", error);
  }
}

function imageUrl(filename) {
  return filename ? `/api/media/${encodeURIComponent(filename)}` : null;
}

function mapPost(row) {
  return {
    id: String(row.id),
    title: row.title,
    category: row.category,
    summary: row.summary,
    content: row.content,
    visibility: row.visibility,
    status: row.status,
    image: imageUrl(row.imagePath),
    createdAt: new Date(row.createdAt).toISOString(),
    commentsCount: Number(row.commentsCount || 0),
  };
}

function positiveId(value) {
  const id = String(value);
  if (!/^[1-9]\d{0,19}$/.test(id) || BigInt(id) > 18446744073709551615n) {
    throw new HttpError(404, "The requested record was not found.");
  }
  return id;
}

function mapProfile(row) {
  return {
    user: { id: String(row.id), fullName: row.fullName, email: row.email, role: row.role, image: imageUrl(row.profileImagePath) },
    biography: row.biography || "",
    visibility: row.visibility || "family",
    image: imageUrl(row.profileImagePath),
  };
}

function mapFeedComment(row) {
  return {
    id: String(row.id),
    author: row.fullName,
    image: imageUrl(row.imagePath),
    content: row.content,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

function publicPublicationQuery(user) {
  const columns = "p.id, p.title, p.category, p.summary, p.content, p.visibility, p.status, p.image_path AS imagePath, p.created_at AS createdAt, (SELECT COUNT(*) FROM publication_comments c WHERE c.post_id = p.id AND c.status = 'approved') AS commentsCount";
  if (user?.role === "super_admin") return { query: `SELECT ${columns} FROM posts p`, values: [] };
  if (user?.role === "editor") {
    return {
      query: `SELECT ${columns} FROM posts p WHERE (p.visibility IN ('public', 'family') AND p.status = 'published') OR (p.author_id = ? AND p.status IN ('draft', 'published'))`,
      values: [user.id],
    };
  }
  if (user?.role === "family_member") {
    return {
      query: `SELECT ${columns} FROM posts p WHERE p.visibility IN ('public', 'family') AND p.status = 'published'`,
      values: [],
    };
  }
  return {
    query: `SELECT ${columns} FROM posts p WHERE p.visibility = 'public' AND p.status = 'published'`,
    values: [],
  };
}

router.get("/health", route(async (_request, response) => {
  await pool.query("SELECT 1");
  response.json({ status: "ok", database: "connected" });
}));

router.get("/auth/session", route(async (request, response) => {
  const user = await currentUser(request);
  response.json({ user: user ? publicUser(user) : null });
}));

router.post("/auth/login", route(async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const password = passwordValue(request.body?.password);
  const [rows] = await pool.execute(
    "SELECT u.id, u.full_name AS fullName, u.email, u.role, u.password_hash AS passwordHash, p.visibility AS profileVisibility, p.profile_image_path AS profileImagePath FROM users u LEFT JOIN personal_profiles p ON p.user_id = u.id WHERE u.email = ? AND u.status = 'approved' LIMIT 1",
    [email],
  );
  if (!rows[0] || !(await verifyPassword(password, rows[0].passwordHash))) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  const token = await createSession(pool, rows[0].id);
  setSessionCookie(response, token);
  response.json({ user: publicUser({
    ...rows[0],
    image: imageUrl(rows[0].profileImagePath),
  }) });
}));

router.post("/auth/logout", route(async (request, response) => {
  const token = readCookie(request, sessionCookie);
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    await pool.execute("DELETE FROM sessions WHERE token_hash = ?", [createHash("sha256").update(token).digest("hex")]);
  }
  clearSessionCookie(response);
  response.json({ ok: true });
}));

router.post("/auth/bootstrap", route(async (request, response) => {
  const configuredKey = process.env.BOOTSTRAP_ADMIN_KEY;
  const suppliedKey = request.get("x-bootstrap-key") || "";
  if (!configuredKey || configuredKey.length < 32) {
    throw new HttpError(503, "First-admin setup is not configured on the server.");
  }
  const expected = Buffer.from(configuredKey);
  const supplied = Buffer.from(suppliedKey);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new HttpError(403, "Bootstrap key is invalid.");
  }
  const fullName = requireValue(request.body?.fullName, "Full name", 160);
  const email = normalizeEmail(request.body?.email);
  const passwordHash = await hashPassword(passwordValue(request.body?.password));
  const connection = await pool.getConnection();
  let token;
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query("SELECT id FROM users LIMIT 1 FOR UPDATE");
    if (existing.length) throw new HttpError(409, "The first administrator has already been created.");
    const [result] = await connection.execute(
      "INSERT INTO users (full_name, email, password_hash, role, status) VALUES (?, ?, ?, 'super_admin', 'approved')",
      [fullName, email, passwordHash],
    );
    await connection.execute("INSERT INTO personal_profiles (user_id) VALUES (?)", [result.insertId]);
    token = await createSession(connection, result.insertId);
    await connection.commit();
    const user = { id: result.insertId, fullName, email, role: "super_admin" };
    setSessionCookie(response, token);
    response.status(201).json({ user });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.post("/auth/register", route(async (request, response) => {
  const fullName = requireValue(request.body?.fullName, "Full name", 160);
  const email = normalizeEmail(request.body?.email);
  const invitationToken = requireValue(request.body?.invitationCode, "Invitation code", 200);
  const passwordHash = await hashPassword(passwordValue(request.body?.password));
  const tokenHash = createHash("sha256").update(invitationToken).digest("hex");
  const connection = await pool.getConnection();
  let user;
  let token;
  try {
    await connection.beginTransaction();
    const [invitations] = await connection.execute(
      "SELECT id FROM invitations WHERE token_hash = ? AND email = ? AND accepted_at IS NULL AND expires_at > NOW() LIMIT 1 FOR UPDATE",
      [tokenHash, email],
    );
    if (!invitations[0]) throw new HttpError(400, "Invitation code is invalid, expired or does not match this email.");
    const [result] = await connection.execute(
      "INSERT INTO users (full_name, email, password_hash, role, status) VALUES (?, ?, ?, 'family_member', 'approved')",
      [fullName, email, passwordHash],
    );
    await connection.execute("INSERT INTO personal_profiles (user_id) VALUES (?)", [result.insertId]);
    await connection.execute("UPDATE invitations SET accepted_at = NOW() WHERE id = ?", [invitations[0].id]);
    token = await createSession(connection, result.insertId);
    await connection.commit();
    user = { id: result.insertId, fullName, email, role: "family_member" };
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") throw new HttpError(409, "An account with this email already exists.");
    throw error;
  } finally {
    connection.release();
  }
  setSessionCookie(response, token);
  response.status(201).json({ user });
}));

router.get("/profile", route(async (request, response) => {
  const viewer = await authenticatedUser(request);
  requireRole(viewer, ["family_member", "editor", "super_admin"]);
  const userId = request.query.userId ? positiveId(request.query.userId) : String(viewer.id);
  if (userId !== String(viewer.id)) requireRole(viewer, ["super_admin"]);
  const [rows] = await pool.execute(
    "SELECT u.id, u.full_name AS fullName, u.email, u.role, p.biography, p.visibility, p.profile_image_path AS profileImagePath FROM users u LEFT JOIN personal_profiles p ON p.user_id = u.id WHERE u.id = ? AND u.status = 'approved' LIMIT 1",
    [userId],
  );
  if (!rows[0]) throw new HttpError(404, "The requested profile was not found.");
  response.json(mapProfile(rows[0]));
}));

router.put("/profile", route(async (request, response) => {
  const viewer = await authenticatedUser(request);
  requireRole(viewer, ["family_member", "editor", "super_admin"]);
  const userId = request.query.userId ? positiveId(request.query.userId) : String(viewer.id);
  if (userId !== String(viewer.id)) requireRole(viewer, ["super_admin"]);
  const fullName = requireValue(request.body?.fullName, "Display name", 160);
  const biography = request.body?.biography == null ? "" : request.body.biography;
  if (typeof biography !== "string" || biography.length > 5000) {
    throw new HttpError(400, "Profile introduction must be at most 5,000 characters.");
  }
  const visibility = request.body?.visibility;
  if (!["public", "family", "private"].includes(visibility)) {
    throw new HttpError(400, "Profile visibility is invalid.");
  }
  const [profiles] = await pool.execute(
    "SELECT profile_image_path AS profileImagePath FROM personal_profiles WHERE user_id = ? LIMIT 1",
    [userId],
  );
  const oldImage = profiles[0]?.profileImagePath || null;
  let newImage = oldImage;
  if (request.body?.removeImage === true) newImage = null;
  else if (request.body?.image) newImage = await storeImage(request.body.image);
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.execute("UPDATE users SET full_name = ? WHERE id = ?", [fullName, userId]);
    await connection.execute(
      "INSERT INTO personal_profiles (user_id, biography, visibility, profile_image_path) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE biography = VALUES(biography), visibility = VALUES(visibility), profile_image_path = VALUES(profile_image_path)",
      [userId, biography.trim(), visibility, newImage],
    );
    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    if (newImage && newImage !== oldImage) await removeStoredImage(newImage);
    throw error;
  } finally {
    connection?.release();
  }
  if (oldImage && oldImage !== newImage) await removeStoredImage(oldImage);
  const [rows] = await pool.execute(
    "SELECT u.id, u.full_name AS fullName, u.email, u.role, p.biography, p.visibility, p.profile_image_path AS profileImagePath FROM users u LEFT JOIN personal_profiles p ON p.user_id = u.id WHERE u.id = ? LIMIT 1",
    [userId],
  );
  response.json(mapProfile(rows[0]));
}));

router.get("/family/members", route(async (request, response) => {
  const viewer = await currentUser(request);
  const canSeeFamily = viewer && ["family_member", "editor", "super_admin"].includes(viewer.role);
  const canSeePrivate = viewer?.role === "super_admin";
  const visibilities = canSeePrivate ? ["public", "family", "private"] : canSeeFamily ? ["public", "family"] : ["public"];
  const placeholders = visibilities.map(() => "?").join(", ");
  const [rows] = await pool.execute(
    `SELECT u.id, u.full_name AS fullName, p.biography, p.visibility, p.profile_image_path AS profileImagePath FROM users u JOIN personal_profiles p ON p.user_id = u.id WHERE u.status = 'approved' AND u.role = 'family_member' AND p.visibility IN (${placeholders}) ORDER BY u.full_name`,
    visibilities,
  );
  response.json(rows.map((row) => ({
    id: String(row.id),
    fullName: row.fullName,
    biography: row.biography || "",
    visibility: row.visibility,
    image: imageUrl(row.profileImagePath),
  })));
}));

router.get("/family/feed", route(async (request, response) => {
  const viewer = await authenticatedUser(request);
  requireRole(viewer, ["family_member", "editor", "super_admin"]);
  const [posts] = await pool.query(
    "SELECT f.id, f.content, f.created_at AS createdAt, u.id AS authorId, u.full_name AS fullName, CASE WHEN p.visibility = 'private' THEN NULL ELSE p.profile_image_path END AS imagePath FROM family_feed_posts f JOIN users u ON u.id = f.author_id LEFT JOIN personal_profiles p ON p.user_id = u.id ORDER BY f.created_at DESC LIMIT 50",
  );
  if (!posts.length) return response.json([]);
  const ids = posts.map((post) => post.id);
  const placeholders = ids.map(() => "?").join(", ");
  const [comments] = await pool.execute(
    `SELECT c.id, c.post_id AS postId, c.content, c.created_at AS createdAt, u.full_name AS fullName, CASE WHEN p.visibility = 'private' THEN NULL ELSE p.profile_image_path END AS imagePath FROM family_feed_comments c JOIN users u ON u.id = c.author_id LEFT JOIN personal_profiles p ON p.user_id = u.id WHERE c.post_id IN (${placeholders}) ORDER BY c.created_at`,
    ids,
  );
  const commentsByPost = new Map();
  for (const comment of comments) {
    const list = commentsByPost.get(String(comment.postId)) || [];
    list.push(mapFeedComment(comment));
    commentsByPost.set(String(comment.postId), list);
  }
  response.json(posts.map((post) => ({
    id: String(post.id),
    author: post.fullName,
    image: imageUrl(post.imagePath),
    content: post.content,
    createdAt: new Date(post.createdAt).toISOString(),
    comments: commentsByPost.get(String(post.id)) || [],
  })));
}));

router.post("/family/feed", route(async (request, response) => {
  const author = await authenticatedUser(request);
  requireRole(author, ["family_member", "editor", "super_admin"]);
  const content = requireValue(request.body?.content, "Post", 2000);
  const [result] = await pool.execute(
    "INSERT INTO family_feed_posts (author_id, content) VALUES (?, ?)",
    [author.id, content],
  );
  response.status(201).json({
    id: String(result.insertId),
    author: author.fullName,
    image: await familyAvatar(author.id),
    content,
    createdAt: new Date().toISOString(),
    comments: [],
  });
}));

router.post("/family/feed/:postId/comments", route(async (request, response) => {
  const author = await authenticatedUser(request);
  requireRole(author, ["family_member", "editor", "super_admin"]);
  const postId = positiveId(request.params.postId);
  const content = requireValue(request.body?.content, "Comment", 1000);
  const [posts] = await pool.execute("SELECT id FROM family_feed_posts WHERE id = ? LIMIT 1", [postId]);
  if (!posts[0]) throw new HttpError(404, "Family post not found.");
  const [result] = await pool.execute(
    "INSERT INTO family_feed_comments (post_id, author_id, content) VALUES (?, ?, ?)",
    [postId, author.id, content],
  );
  const image = await familyAvatar(author.id);
  response.status(201).json({
    id: String(result.insertId),
    author: author.fullName,
    image,
    content,
    createdAt: new Date().toISOString(),
  });
}));

router.post("/invitations", route(async (request, response) => {
  const user = await authenticatedUser(request);
  requireRole(user, ["super_admin"]);
  const email = normalizeEmail(request.body?.email);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await pool.execute(
    "INSERT INTO invitations (email, token_hash, invited_by, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))",
    [email, tokenHash, user.id],
  );
  response.status(201).json({ token });
}));

router.get("/invitations", route(async (request, response) => {
  const user = await authenticatedUser(request);
  requireRole(user, ["super_admin"]);
  const [rows] = await pool.query(
    "SELECT email, expires_at AS expiresAt, accepted_at AS acceptedAt FROM invitations ORDER BY created_at DESC LIMIT 50",
  );
  response.json(rows);
}));

router.get("/publications/:postId", route(async (request, response) => {
  const user = await currentUser(request);
  const postId = positiveId(request.params.postId);
  const columns = "p.id, p.title, p.category, p.summary, p.content, p.visibility, p.status, p.image_path AS imagePath, p.created_at AS createdAt, (SELECT COUNT(*) FROM publication_comments c WHERE c.post_id = p.id AND c.status = 'approved') AS commentsCount";
  let condition = "p.visibility = 'public' AND p.status = 'published'";
  let values = [postId];
  if (user?.role === "super_admin") condition = "1 = 1";
  else if (user?.role === "editor") {
    condition = "((p.visibility IN ('public', 'family') AND p.status = 'published') OR (p.author_id = ? AND p.status IN ('draft', 'published')))";
    values = [user.id, postId];
  } else if (user?.role === "family_member") condition = "p.visibility IN ('public', 'family') AND p.status = 'published'";
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM posts p WHERE ${condition} AND p.id = ? LIMIT 1`,
    values,
  );
  if (!rows[0]) throw new HttpError(404, "Publication not found.");
  response.json(mapPost(rows[0]));
}));

router.get("/publications/:postId/comments", route(async (request, response) => {
  const postId = positiveId(request.params.postId);
  const [posts] = await pool.execute(
    "SELECT id FROM posts WHERE id = ? AND visibility = 'public' AND status = 'published' LIMIT 1",
    [postId],
  );
  if (!posts[0]) throw new HttpError(404, "Publication not found.");
  const [comments] = await pool.execute(
    "SELECT id, author_name AS authorName, content, created_at AS createdAt FROM publication_comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 100",
    [postId],
  );
  response.json(comments.reverse().map((comment) => ({
    id: String(comment.id),
    author: comment.authorName,
    content: comment.content,
    createdAt: new Date(comment.createdAt).toISOString(),
  })));
}));

router.post("/publications/:postId/comments", route(async (request, response) => {
  const postId = positiveId(request.params.postId);
  const author = await currentUser(request);
  const authorName = author ? author.fullName : requireValue(request.body?.authorName, "Name", 120);
  const content = requireValue(request.body?.content, "Comment", 2000);
  const [posts] = await pool.execute(
    "SELECT id FROM posts WHERE id = ? AND visibility = 'public' AND status = 'published' LIMIT 1",
    [postId],
  );
  if (!posts[0]) throw new HttpError(404, "Publication not found.");
  await pool.execute(
    "INSERT INTO publication_comments (post_id, author_id, author_name, content) VALUES (?, ?, ?, ?)",
    [postId, author?.id || null, authorName, content],
  );
  response.status(201).json({ message: "Your comment was submitted for approval." });
}));

router.get("/admin/publication-comments", route(async (request, response) => {
  const user = await authenticatedUser(request);
  requireRole(user, ["super_admin"]);
  const [comments] = await pool.query(
    "SELECT c.id, c.post_id AS postId, p.title AS postTitle, c.author_name AS authorName, c.content, c.created_at AS createdAt FROM publication_comments c JOIN posts p ON p.id = c.post_id WHERE c.status = 'pending' ORDER BY c.created_at LIMIT 100",
  );
  response.json(comments.map((comment) => ({
    id: String(comment.id),
    postId: String(comment.postId),
    postTitle: comment.postTitle,
    authorName: comment.authorName,
    content: comment.content,
    createdAt: new Date(comment.createdAt).toISOString(),
  })));
}));

router.post("/admin/publication-comments/:commentId/moderate", route(async (request, response) => {
  const user = await authenticatedUser(request);
  requireRole(user, ["super_admin"]);
  const commentId = positiveId(request.params.commentId);
  const status = request.body?.status;
  if (!["approved", "rejected"].includes(status)) throw new HttpError(400, "Comment moderation status is invalid.");
  const [result] = await pool.execute(
    "UPDATE publication_comments SET status = ?, moderated_by = ?, moderated_at = NOW() WHERE id = ? AND status = 'pending'",
    [status, user.id, commentId],
  );
  if (!result.affectedRows) throw new HttpError(409, "Comment was already moderated or no longer exists.");
  response.json({ status });
}));

router.get("/publications", route(async (request, response) => {
  const user = await currentUser(request);
  const { query, values } = publicPublicationQuery(user);
  const [rows] = await pool.execute(`${query} ORDER BY p.created_at DESC LIMIT 200`, values);
  response.json(rows.map(mapPost));
}));

router.post("/publications", route(async (request, response) => {
  const user = await authenticatedUser(request);
  requireRole(user, ["super_admin", "editor"]);
  const title = requireValue(request.body?.title, "Title", 240);
  const category = requireValue(request.body?.category, "Category", 80);
  const summary = requireValue(request.body?.summary, "Summary", 2000);
  const content = request.body?.content == null ? "" : request.body.content;
  if (typeof content !== "string" || content.length > 100000) throw new HttpError(400, "Content must be at most 100,000 characters.");
  const visibility = request.body?.visibility;
  const status = request.body?.status;
  if (!["public", "family", "private"].includes(visibility) || !["draft", "published"].includes(status)) {
    throw new HttpError(400, "Publication visibility or status is invalid.");
  }
  if (visibility !== "public" && status === "published" && user.role !== "super_admin") {
    throw new HttpError(403, "Only an administrator can publish family or private content.");
  }
  const imagePath = await storeImage(request.body?.image);
  try {
    const [result] = await pool.execute(
      "INSERT INTO posts (author_id, title, category, summary, content, image_path, status, visibility, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, IF(? = 'published', NOW(), NULL))",
      [user.id, title, category, summary, content, imagePath, status, visibility, status],
    );
    const [rows] = await pool.execute(
      "SELECT id, title, category, summary, content, visibility, status, image_path AS imagePath, created_at AS createdAt FROM posts WHERE id = ?",
      [result.insertId],
    );
    response.status(201).json(mapPost(rows[0]));
  } catch (error) {
    if (imagePath) await removeStoredImage(imagePath);
    throw error;
  }
}));

router.get("/photos", route(async (request, response) => {
  const user = await currentUser(request);
  let query = "SELECT p.id, p.file_path AS imagePath, p.caption, p.created_at AS createdAt, a.title AS album, a.visibility, p.uploaded_by AS uploadedBy FROM photos p JOIN albums a ON a.id = p.album_id WHERE a.visibility = 'public'";
  const values = [];
  if (user?.role === "super_admin") {
    query = "SELECT p.id, p.file_path AS imagePath, p.caption, p.created_at AS createdAt, a.title AS album, a.visibility, p.uploaded_by AS uploadedBy FROM photos p JOIN albums a ON a.id = p.album_id";
  } else if (user?.role === "editor") {
    query += " OR (a.visibility = 'family') OR (p.uploaded_by = ? AND a.visibility = 'private')";
    values.push(user.id);
  } else if (user?.role === "family_member") {
    query += " OR (a.visibility = 'family')";
  }
  const [rows] = await pool.execute(`${query} ORDER BY p.created_at DESC LIMIT 300`, values);
  response.json(rows.map((row) => ({
    id: String(row.id),
    image: imageUrl(row.imagePath),
    caption: row.caption,
    album: row.album,
    visibility: row.visibility,
    createdAt: new Date(row.createdAt).toISOString(),
  })));
}));

router.post("/photos", route(async (request, response) => {
  const user = await authenticatedUser(request);
  requireRole(user, ["super_admin", "editor"]);
  const album = requireValue(request.body?.album, "Album", 180);
  const rawCaption = request.body?.caption == null ? "" : request.body.caption;
  if (typeof rawCaption !== "string") throw new HttpError(400, "Caption must be text.");
  const caption = rawCaption.trim();
  if (typeof caption !== "string" || caption.length > 500) throw new HttpError(400, "Caption must be at most 500 characters.");
  const visibility = request.body?.visibility;
  if (!["public", "family", "private"].includes(visibility)) throw new HttpError(400, "Photo visibility is invalid.");
  if (visibility === "private" && user.role !== "super_admin") {
    throw new HttpError(403, "Only an administrator can upload private photos.");
  }
  const imagePath = await storeImage(request.body?.image);
  if (!imagePath) throw new HttpError(400, "Choose a photo to upload.");
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [albums] = await connection.execute(
      "SELECT id FROM albums WHERE title = ? AND visibility = ? LIMIT 1 FOR UPDATE",
      [album, visibility],
    );
    let albumId = albums[0]?.id;
    if (!albumId) {
      const [createdAlbum] = await connection.execute(
        "INSERT INTO albums (title, visibility, created_by) VALUES (?, ?, ?)",
        [album, visibility, user.id],
      );
      albumId = createdAlbum.insertId;
    }
    const [result] = await connection.execute(
      "INSERT INTO photos (album_id, file_path, caption, uploaded_by) VALUES (?, ?, ?, ?)",
      [albumId, imagePath, caption || null, user.id],
    );
    await connection.commit();
    response.status(201).json({
      id: String(result.insertId),
      image: imageUrl(imagePath),
      caption,
      album,
      visibility,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (connection) await connection.rollback();
    await removeStoredImage(imagePath);
    throw error;
  } finally {
    connection?.release();
  }
}));

router.get("/media/:filename", route(async (request, response) => {
  const filename = request.params.filename;
  if (!/^[a-f0-9-]{36}\.(?:jpg|png|gif|webp)$/.test(filename)) throw new HttpError(404, "Image not found.");
  const [posts] = await pool.execute(
    "SELECT visibility, status, author_id AS authorId, image_path AS imagePath FROM posts WHERE image_path = ? LIMIT 1",
    [filename],
  );
  const [photos] = await pool.execute(
    "SELECT a.visibility, p.uploaded_by AS uploadedBy FROM photos p JOIN albums a ON a.id = p.album_id WHERE p.file_path = ? LIMIT 1",
    [filename],
  );
  const [profiles] = await pool.execute(
    "SELECT user_id AS profileUserId, visibility FROM personal_profiles WHERE profile_image_path = ? LIMIT 1",
    [filename],
  );
  const media = posts[0] ? { ...posts[0], type: "post" }
    : photos[0] ? { ...photos[0], type: "photo" }
      : profiles[0] ? { ...profiles[0], type: "profile" } : null;
  if (!media) throw new HttpError(404, "Image not found.");
  const user = await currentUser(request);
  const ownerId = media.type === "post" ? media.authorId : media.type === "photo" ? media.uploadedBy : media.profileUserId;
  const isOwner = user && String(ownerId) === String(user.id);
  const isPublic = media.visibility === "public" && (media.type !== "post" || media.status === "published");
  const isFamily = media.visibility === "family" && user;
  if (!isPublic && !isFamily && !isOwner && user?.role !== "super_admin") {
    throw new HttpError(user ? 403 : 401, "You do not have permission to view this image.");
  }
  const extension = path.extname(filename);
  const contentType = { ".jpg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp" }[extension];
  const data = await readFile(path.join(uploadDirectory, filename));
  response.set("Cache-Control", "private, no-store");
  response.type(contentType).send(data);
}));

export default router;
