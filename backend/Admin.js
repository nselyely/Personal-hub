import "dotenv/config";
import mysql from "mysql2/promise";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set in the environment.`);
  return value;
}

const email = requiredEnv("ADMIN_EMAIL").trim().toLowerCase();
const password = requiredEnv("ADMIN_PASSWORD");
if (password.length < 10 || password.length > 128) {
  throw new Error("ADMIN_PASSWORD must be between 10 and 128 characters.");
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  database: requiredEnv("DB_NAME"),
  user: requiredEnv("DB_USER"),
  password: requiredEnv("DB_PASSWORD"),
});

try {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  const passwordHash = `scrypt$16384$8$1$${salt.toString("hex")}$${key.toString("hex")}`;
  const [result] = await connection.execute(
    "UPDATE users SET password_hash = ? WHERE email = ? AND role = 'super_admin' AND status = 'approved'",
    [passwordHash, email],
  );
  if (result.affectedRows !== 1) {
    throw new Error("No matching approved super-admin account was updated.");
  }
  console.log("Super-admin password updated.");
} finally {
  await connection.end();
}
