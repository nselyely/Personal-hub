USE personal_family_hub;

ALTER TABLE personal_profiles
  ADD COLUMN profile_image_path VARCHAR(500) NULL AFTER education;

INSERT INTO personal_profiles (user_id)
SELECT u.id FROM users u
LEFT JOIN personal_profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

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
