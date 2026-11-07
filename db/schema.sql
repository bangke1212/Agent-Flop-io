CREATE TABLE IF NOT EXISTS bot_settings (
  id TINYINT PRIMARY KEY,
  schedule_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  schedule_expression VARCHAR(64) NOT NULL DEFAULT '*/30 * * * *',
  room VARCHAR(48) NOT NULL DEFAULT 'lobby',
  checkin_message VARCHAR(4096) NOT NULL DEFAULT 'FLOP agent check-in',
  last_nonce BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bot_activity (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL,
  summary VARCHAR(1000) NOT NULL,
  nonce BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX activity_created_at_idx (created_at)
);

INSERT IGNORE INTO bot_settings (id, schedule_enabled, schedule_expression, room, checkin_message)
VALUES (1, FALSE, '*/30 * * * *', 'lobby', 'FLOP agent check-in');
