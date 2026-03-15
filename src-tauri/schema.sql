CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('down', 'up')),
  interval_ms INTEGER,
  hold_duration_ms INTEGER,
  session_id TEXT NOT NULL,
  active_app_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events (session_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  key_down_count INTEGER NOT NULL DEFAULT 0,
  avg_interval_ms REAL,
  avg_hold_duration_ms REAL
);

CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions (started_at);

CREATE TABLE IF NOT EXISTS minute_stats (
  minute_timestamp TEXT PRIMARY KEY,
  key_count INTEGER NOT NULL DEFAULT 0,
  active_seconds REAL NOT NULL DEFAULT 0,
  avg_interval_ms REAL,
  avg_hold_duration_ms REAL,
  interval_sum_ms INTEGER NOT NULL DEFAULT 0,
  interval_count INTEGER NOT NULL DEFAULT 0,
  hold_sum_ms INTEGER NOT NULL DEFAULT 0,
  hold_count INTEGER NOT NULL DEFAULT 0,
  burst_flag INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_stats (
  day_date TEXT PRIMARY KEY,
  key_count INTEGER NOT NULL DEFAULT 0,
  active_seconds REAL NOT NULL DEFAULT 0,
  avg_interval_ms REAL,
  avg_hold_duration_ms REAL,
  session_count INTEGER NOT NULL DEFAULT 0,
  total_session_ms INTEGER NOT NULL DEFAULT 0,
  burst_count INTEGER NOT NULL DEFAULT 0,
  interval_sum_ms INTEGER NOT NULL DEFAULT 0,
  interval_count INTEGER NOT NULL DEFAULT 0,
  hold_sum_ms INTEGER NOT NULL DEFAULT 0,
  hold_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runner_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_heartbeat_at TEXT,
  last_flush_at TEXT,
  last_started_at TEXT,
  last_error TEXT,
  autostart_enabled INTEGER NOT NULL DEFAULT 1,
  runner_version TEXT,
  pid INTEGER
);
