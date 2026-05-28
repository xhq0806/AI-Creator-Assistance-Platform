CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL UNIQUE,
  `email` VARCHAR(100) DEFAULT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `articles` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `media_urls` JSON DEFAULT NULL,
  `status` ENUM('draft', 'pending_review', 'published', 'rejected', 'withdrawn') DEFAULT 'draft',
  `quality_score` DECIMAL(5,2) DEFAULT 0.00,
  `view_count` INT UNSIGNED DEFAULT 0,
  `like_count` INT UNSIGNED DEFAULT 0,
  `favorite_count` INT UNSIGNED DEFAULT 0,
  `negative_count` INT UNSIGNED DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  INDEX `idx_quality_status` (`status`, `quality_score` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `prompt_teams` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(128) NOT NULL,
  `owner_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `prompt_team_members` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `team_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role` ENUM('viewer', 'editor', 'admin') DEFAULT 'viewer',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`team_id`) REFERENCES `prompt_teams`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_team_user` (`team_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `prompt_templates` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED DEFAULT NULL,
  `team_id` BIGINT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(80) NOT NULL,
  `category` VARCHAR(40) NOT NULL DEFAULT '通用',
  `content` TEXT NOT NULL,
  `visibility` ENUM('private', 'team_public', 'system_public') DEFAULT 'private',
  `usage_count` INT UNSIGNED DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`team_id`) REFERENCES `prompt_teams`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `prompt_template_versions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `template_id` BIGINT UNSIGNED NOT NULL,
  `version_no` INT UNSIGNED NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `content` TEXT NOT NULL,
  `change_note` VARCHAR(512) NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`template_id`) REFERENCES `prompt_templates`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  UNIQUE KEY `uk_template_version` (`template_id`, `version_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `materials` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `url` VARCHAR(600) NOT NULL,
  `file_key` VARCHAR(512) NULL COMMENT '云存储文件唯一标识',
  `file_size` BIGINT UNSIGNED NULL COMMENT '文件大小（字节）',
  `mime_type` VARCHAR(128) NULL COMMENT 'MIME类型 image/png video/mp4',
  `media_type` ENUM('image', 'video', 'audio') NOT NULL,
  `upload_status` ENUM('pending', 'uploading', 'done', 'failed') DEFAULT 'done',
  `risk_status` ENUM('approved', 'rejected') NOT NULL DEFAULT 'approved',
  `risk_reason` VARCHAR(255) NOT NULL DEFAULT '基础校验通过',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  INDEX `idx_material_user_type` (`user_id`, `media_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `article_versions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `article_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `version_no` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `media_urls` JSON DEFAULT NULL,
  `status` VARCHAR(30) NOT NULL,
  `quality_score` DECIMAL(5,2) DEFAULT 0.00,
  `source` ENUM('draft_save', 'publish', 'offline_sync', 'restore', 'withdraw') NOT NULL DEFAULT 'draft_save',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  INDEX `idx_article_version` (`article_id`, `version_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `article_id` BIGINT UNSIGNED DEFAULT NULL,
  `risk_category` VARCHAR(50) DEFAULT NULL,
  `is_compliant` TINYINT(1) NOT NULL DEFAULT 1,
  `raw_ai_response` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `audit_manual_annotations` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `article_id` BIGINT UNSIGNED NULL,
  `title` TEXT NOT NULL,
  `content` TEXT NOT NULL,
  `ai_prediction_risk` ENUM('SAFE', 'RISK_LOW', 'RISK_MEDIUM', 'RISK_HIGH') NOT NULL,
  `ground_truth_risk` ENUM('SAFE', 'RISK_LOW', 'RISK_MEDIUM', 'RISK_HIGH') NOT NULL,
  `risk_category` ENUM('NONE', 'PORN', 'GAMBLING', 'DRUG', 'POLITICAL', 'OTHER') DEFAULT 'NONE',
  `annotator_id` BIGINT UNSIGNED NULL,
  `annotation_note` TEXT NULL COMMENT '标注备注说明',
  `annotated_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`annotator_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `audit_evaluation_reports` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `total_samples` INT UNSIGNED NOT NULL,
  `accuracy_rate` DECIMAL(7,6) NOT NULL COMMENT '整体准确率',
  `precision_rate` DECIMAL(7,6) NOT NULL COMMENT '精确率',
  `recall_rate` DECIMAL(7,6) NOT NULL COMMENT '召回率',
  `f1_score` DECIMAL(7,6) NOT NULL,
  `report_generated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
