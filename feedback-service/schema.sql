CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  digest TEXT NOT NULL,
  payload TEXT NOT NULL,
  stored_at TEXT NOT NULL,
  notification TEXT NOT NULL DEFAULT 'pending',
  message_id TEXT
);
CREATE INDEX IF NOT EXISTS reports_stored_at ON reports(stored_at);

CREATE TABLE IF NOT EXISTS update_feed (id TEXT PRIMARY KEY CHECK (id = 'latest'), payload TEXT NOT NULL);
