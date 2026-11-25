CREATE DATABASE IF NOT EXISTS personal_family_hub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE personal_family_hub;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'editor', 'family_member', 'visitor') NOT NULL DEFAULT 'family_member',
  status ENUM('pending', 'approved', 'suspended') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE personal_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  biography TEXT NULL,
  education TEXT NULL,
  profile_image_path VARCHAR(500) NULL,
  visibility ENUM('public', 'family', 'private') NOT NULL DEFAULT 'family',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE family_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  linked_user_id BIGINT UNSIGNED NULL UNIQUE,
  display_name VARCHAR(160) NOT NULL,
  biography TEXT NULL,
  birth_date DATE NULL,
  visibility ENUM('public', 'family', 'private') NOT NULL DEFAULT 'family',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_family_linked_user FOREIGN KEY (linked_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE family_relationships (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT UNSIGNED NOT NULL,
  related_member_id BIGINT UNSIGNED NOT NULL,
  relationship_type VARCHAR(50) NOT NULL,
  CONSTRAINT fk_relationship_member FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE,
  CONSTRAINT fk_relationship_related FOREIGN KEY (related_member_id) REFERENCES family_members(id) ON DELETE CASCADE,
  CONSTRAINT uq_family_relationship UNIQUE (member_id, related_member_id, relationship_type),
  CONSTRAINT chk_no_self_relationship CHECK (member_id <> related_member_id)
);

CREATE TABLE posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  author_id BIGINT UNSIGNED NULL,
  title VARCHAR(240) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Personal story',
  summary VARCHAR(2000) NOT NULL DEFAULT '',
  content MEDIUMTEXT NOT NULL,
  image_path VARCHAR(500) NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  visibility ENUM('public', 'family', 'private') NOT NULL DEFAULT 'public',
  published_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_posts_visibility_status (visibility, status, published_at)
);

CREATE TABLE publication_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NULL,
  author_name VARCHAR(120) NOT NULL,
  content TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  moderated_by BIGINT UNSIGNED NULL,
  moderated_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_publication_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_publication_comments_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_publication_comments_moderator FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_publication_comments_post_status (post_id, status, created_at)
);

CREATE TABLE family_feed_posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  author_id BIGINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_family_feed_posts_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_family_feed_posts_created (created_at)
);

CREATE TABLE family_feed_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_family_feed_comments_post FOREIGN KEY (post_id) REFERENCES family_feed_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_family_feed_comments_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_family_feed_comments_post_created (post_id, created_at)
);

CREATE TABLE albums (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  visibility ENUM('public', 'family', 'private') NOT NULL DEFAULT 'family',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_albums_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  album_id BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  caption VARCHAR(500) NULL,
  taken_at DATE NULL,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_photos_album FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
  CONSTRAINT fk_photos_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE invitations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  invited_by BIGINT UNSIGNED NULL,
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invitations_inviter FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_invitations_email_expiry (email, expires_at)
);

CREATE TABLE sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_expiry (expires_at)
);

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  target_type VARCHAR(80) NULL,
  target_id BIGINT UNSIGNED NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_logs_created (created_at)
);
