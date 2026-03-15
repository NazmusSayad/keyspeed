CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('down', 'up')),
  interval_ms INTEGER,
  hold_duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp);
