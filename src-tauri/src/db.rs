use std::{collections::HashMap, time::Duration};

use anyhow::Result;
use chrono::{DateTime, SecondsFormat, Utc};
use sqlx::{
  sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
  Executor, Row, SqlitePool,
};

use crate::{
  models::{
    AppSettings, DailySummary, DashboardPayload, OverviewMetrics, ProductivityMetrics,
    SessionSummary, TimelinePoint,
  },
  storage,
};

const SCHEMA_SQL: &str = include_str!("../schema.sql");

#[derive(Debug, Clone)]
pub enum EventKind {
  Down,
  Up,
}

impl EventKind {
  fn as_str(&self) -> &'static str {
    match self {
      Self::Down => "down",
      Self::Up => "up",
    }
  }
}

#[derive(Debug, Clone)]
pub struct PendingEvent {
  pub timestamp: DateTime<Utc>,
  pub event_type: EventKind,
  pub interval_ms: Option<i64>,
  pub hold_duration_ms: Option<i64>,
}

pub async fn connect_pool() -> Result<SqlitePool> {
  let path = storage::database_path()?;

  let options = SqliteConnectOptions::new()
    .filename(&path)
    .create_if_missing(true)
    .journal_mode(SqliteJournalMode::Wal)
    .synchronous(SqliteSynchronous::Normal)
    .busy_timeout(Duration::from_secs(5));

  let pool = SqlitePoolOptions::new()
    .max_connections(5)
    .connect_with(options)
    .await?;

  pool.execute(sqlx::raw_sql(SCHEMA_SQL)).await?;

  Ok(pool)
}

pub async fn load_dashboard(pool: &SqlitePool, settings: &AppSettings) -> Result<DashboardPayload> {
  let now = Utc::now();
  let today = now.date_naive().to_string();
  let week_start = (now.date_naive() - chrono::Duration::days(6)).to_string();
  let daily_window_start = (now.date_naive() - chrono::Duration::days(13)).to_string();
  let last_24_hours = format_timestamp(now - chrono::Duration::hours(24));
  let session_gap_ms = (settings.idle_timeout_seconds as i64 * 1_000).max(1);

  let totals = sqlx::query(
        "SELECT COALESCE(SUM(CASE WHEN event_type = 'down' THEN 1 ELSE 0 END), 0) AS total_keys, COALESCE(SUM(MIN(MAX(COALESCE(interval_ms, 0), 0), 1000)) / 1000.0, 0) AS total_active_seconds, COALESCE(SUM(interval_ms), 0) AS interval_sum_ms, COUNT(interval_ms) AS interval_count, COALESCE(SUM(hold_duration_ms), 0) AS hold_sum_ms, COUNT(hold_duration_ms) AS hold_count FROM events",
    )
    .fetch_one(pool)
    .await?;

  let today_row = sqlx::query(
        "SELECT COALESCE(SUM(CASE WHEN event_type = 'down' THEN 1 ELSE 0 END), 0) AS key_count, COALESCE(SUM(MIN(MAX(COALESCE(interval_ms, 0), 0), 1000)) / 1000.0, 0) AS active_seconds FROM events WHERE timestamp >= ?",
    )
    .bind(&today)
    .fetch_one(pool)
    .await?;

  let timeline_rows = sqlx::query(
        "SELECT substr(timestamp, 1, 16) || ':00Z' AS minute_timestamp, COALESCE(SUM(CASE WHEN event_type = 'down' THEN 1 ELSE 0 END), 0) AS key_count, COALESCE(SUM(MIN(MAX(COALESCE(interval_ms, 0), 0), 1000)) / 1000.0, 0) AS active_seconds, AVG(interval_ms) AS avg_interval_ms FROM events WHERE timestamp >= ? GROUP BY substr(timestamp, 1, 16) ORDER BY minute_timestamp ASC",
    )
    .bind(&last_24_hours)
    .fetch_all(pool)
    .await?;

  let minute_rows = sqlx::query(
        "SELECT substr(timestamp, 1, 10) AS day_date, COALESCE(SUM(CASE WHEN event_type = 'down' THEN 1 ELSE 0 END), 0) AS key_count, COALESCE(SUM(MIN(MAX(COALESCE(interval_ms, 0), 0), 1000)) / 1000.0, 0) AS active_seconds, AVG(interval_ms) AS avg_interval_ms FROM events WHERE timestamp >= ? GROUP BY substr(timestamp, 1, 10), substr(timestamp, 1, 16) ORDER BY day_date ASC",
    )
    .bind(&daily_window_start)
    .fetch_all(pool)
    .await?;

  let session_rows = sqlx::query(
        "WITH ordered AS (SELECT timestamp, event_type, interval_ms, hold_duration_ms, SUM(CASE WHEN COALESCE(interval_ms, 0) > ? THEN 1 ELSE 0 END) OVER (ORDER BY timestamp ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_group FROM events), sessions AS (SELECT printf('session-%lld', session_group) AS id, MIN(timestamp) AS started_at, MAX(timestamp) AS ended_at, CAST(ROUND((julianday(MAX(timestamp)) - julianday(MIN(timestamp))) * 86400000.0) AS INTEGER) AS duration_ms, SUM(CASE WHEN event_type = 'down' THEN 1 ELSE 0 END) AS key_down_count, AVG(interval_ms) AS avg_interval_ms, AVG(hold_duration_ms) AS avg_hold_duration_ms FROM ordered GROUP BY session_group) SELECT id, started_at, ended_at, duration_ms, key_down_count, avg_interval_ms, avg_hold_duration_ms FROM sessions ORDER BY started_at DESC LIMIT 12",
    )
    .bind(session_gap_ms)
    .fetch_all(pool)
    .await?;

  let daily_session_rows = sqlx::query(
        "WITH ordered AS (SELECT timestamp, event_type, interval_ms, hold_duration_ms, SUM(CASE WHEN COALESCE(interval_ms, 0) > ? THEN 1 ELSE 0 END) OVER (ORDER BY timestamp ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_group FROM events), sessions AS (SELECT printf('session-%lld', session_group) AS id, MIN(timestamp) AS started_at, MAX(timestamp) AS ended_at, CAST(ROUND((julianday(MAX(timestamp)) - julianday(MIN(timestamp))) * 86400000.0) AS INTEGER) AS duration_ms, SUM(CASE WHEN event_type = 'down' THEN 1 ELSE 0 END) AS key_down_count, AVG(interval_ms) AS avg_interval_ms, AVG(hold_duration_ms) AS avg_hold_duration_ms FROM ordered GROUP BY session_group) SELECT id, started_at, ended_at, duration_ms, key_down_count, avg_interval_ms, avg_hold_duration_ms FROM sessions WHERE started_at >= ? ORDER BY started_at ASC",
    )
    .bind(session_gap_ms)
    .bind(&daily_window_start)
    .fetch_all(pool)
    .await?;

  let last_updated_at = sqlx::query("SELECT MAX(timestamp) AS last_updated_at FROM events")
    .fetch_one(pool)
    .await?
    .try_get::<Option<String>, _>("last_updated_at")?;

  let total_key_presses = totals.try_get::<i64, _>("total_keys")?;
  let total_active_seconds = totals.try_get::<f64, _>("total_active_seconds")?;
  let interval_sum_ms = totals.try_get::<i64, _>("interval_sum_ms")?;
  let interval_count = totals.try_get::<i64, _>("interval_count")?;
  let hold_sum_ms = totals.try_get::<i64, _>("hold_sum_ms")?;
  let hold_count = totals.try_get::<i64, _>("hold_count")?;

  let today_keys = today_row.try_get::<i64, _>("key_count")?;
  let today_active_seconds = today_row.try_get::<f64, _>("active_seconds")?;
  let today_keys_per_minute = if today_keys == 0 {
    0.0
  } else {
    today_keys as f64 / (today_active_seconds / 60.0).max(1.0)
  };
  let estimated_wpm = today_keys_per_minute / 5.0;

  let overview_base = OverviewMetrics {
    total_key_presses,
    today_keys,
    today_keys_per_minute,
    estimated_wpm,
    week_keys: 0,
    average_interval_ms: option_average(interval_sum_ms, interval_count),
    average_hold_duration_ms: option_average(hold_sum_ms, hold_count),
    active_seconds: total_active_seconds,
    idle_seconds: 0.0,
  };

  let timeline = timeline_rows
    .into_iter()
    .map(|row| TimelinePoint {
      timestamp: row.try_get("minute_timestamp").unwrap_or_default(),
      key_count: row.try_get("key_count").unwrap_or_default(),
      active_seconds: row.try_get("active_seconds").unwrap_or_default(),
      average_interval_ms: row
        .try_get::<Option<f64>, _>("avg_interval_ms")
        .unwrap_or(None),
    })
    .collect();

  let mut daily_metrics = HashMap::new();
  for row in minute_rows {
    let date = row.try_get::<String, _>("day_date").unwrap_or_default();
    let key_count = row.try_get::<i64, _>("key_count").unwrap_or_default();
    let active_seconds = row.try_get::<f64, _>("active_seconds").unwrap_or_default();
    let avg_interval_ms = row
      .try_get::<Option<f64>, _>("avg_interval_ms")
      .ok()
      .flatten();

    let day = daily_metrics.entry(date).or_insert((0_i64, 0.0_f64, 0_i64));
    day.0 += key_count;
    day.1 += active_seconds;
    if key_count >= 45 || avg_interval_ms.map(|value| value <= 170.0).unwrap_or(false) {
      day.2 += 1;
    }
  }

  let mut session_count_by_day = HashMap::new();
  let mut total_session_ms_by_day = HashMap::new();
  for row in &daily_session_rows {
    let started_at = row.try_get::<String, _>("started_at").unwrap_or_default();
    let day = started_at.chars().take(10).collect::<String>();
    *session_count_by_day.entry(day.clone()).or_insert(0_i64) += 1;
    *total_session_ms_by_day.entry(day).or_insert(0_i64) +=
      row.try_get::<i64, _>("duration_ms").unwrap_or_default();
  }

  let mut daily_summaries: Vec<_> = daily_metrics
    .into_iter()
    .map(
      |(date, (key_count, active_seconds, burst_count))| DailySummary {
        date: date.clone(),
        key_count,
        active_seconds,
        estimated_wpm: if key_count == 0 {
          0.0
        } else {
          (key_count as f64 / (active_seconds / 60.0).max(1.0)) / 5.0
        },
        session_count: session_count_by_day.get(&date).copied().unwrap_or_default(),
        burst_count,
      },
    )
    .collect();
  daily_summaries.sort_by(|left, right| left.date.cmp(&right.date));

  let today_total_session_ms = total_session_ms_by_day
    .get(&today)
    .copied()
    .unwrap_or_default();
  let idle_seconds = ((today_total_session_ms as f64 / 1_000.0) - today_active_seconds).max(0.0);

  let mut week_keys = 0_i64;
  let mut week_burst_count = 0_i64;
  let mut active_days = 0_i64;
  for summary in &daily_summaries {
    if summary.date >= week_start {
      week_keys += summary.key_count;
      week_burst_count += summary.burst_count;
      if summary.key_count > 0 {
        active_days += 1;
      }
    }
  }

  let week_session_durations: Vec<_> = daily_session_rows
    .iter()
    .filter_map(|row| {
      let started_at = row.try_get::<String, _>("started_at").ok()?;
      if started_at < week_start {
        return None;
      }

      Some(row.try_get::<i64, _>("duration_ms").unwrap_or_default())
    })
    .collect();
  let week_total_session_ms: i64 = week_session_durations.iter().sum();
  let average_session_minutes = if week_session_durations.is_empty() {
    0.0
  } else {
    week_total_session_ms as f64 / week_session_durations.len() as f64 / 60_000.0
  };
  let longest_session_minutes =
    week_session_durations.into_iter().max().unwrap_or_default() as f64 / 60_000.0;
  let consistency_score = ((active_days as f64 / 7.0) * 100.0).clamp(0.0, 100.0);
  let focus_score = ((week_keys as f64 / 3_500.0).min(1.0) * 40.0
    + (average_session_minutes / 18.0).min(1.0) * 30.0
    + (active_days as f64 / 7.0).min(1.0) * 30.0)
    .clamp(0.0, 100.0);

  let overview = OverviewMetrics {
    week_keys,
    idle_seconds,
    ..overview_base
  };

  let recent_sessions = session_rows
    .into_iter()
    .map(|row| SessionSummary {
      id: row.try_get("id").unwrap_or_default(),
      started_at: row.try_get("started_at").unwrap_or_default(),
      ended_at: row.try_get("ended_at").unwrap_or_default(),
      duration_minutes: row.try_get::<i64, _>("duration_ms").unwrap_or_default() as f64 / 60_000.0,
      key_count: row.try_get("key_down_count").unwrap_or_default(),
      average_interval_ms: row.try_get("avg_interval_ms").ok(),
      average_hold_duration_ms: row.try_get("avg_hold_duration_ms").ok(),
    })
    .collect();

  let productivity = ProductivityMetrics {
    focus_score,
    consistency_score,
    burst_count: week_burst_count,
    average_session_minutes,
    longest_session_minutes,
  };

  Ok(DashboardPayload {
    overview,
    timeline,
    daily_summaries,
    recent_sessions,
    productivity,
    last_updated_at,
  })
}

pub async fn ingest_batch(pool: &SqlitePool, events: &[PendingEvent]) -> Result<()> {
  if events.is_empty() {
    return Ok(());
  }

  let mut tx = pool.begin().await?;

  for event in events {
    sqlx::query(
            "INSERT INTO events (timestamp, event_type, interval_ms, hold_duration_ms) VALUES (?, ?, ?, ?)",
        )
        .bind(format_timestamp(event.timestamp))
        .bind(event.event_type.as_str())
        .bind(event.interval_ms)
        .bind(event.hold_duration_ms)
        .execute(&mut *tx)
        .await?;
  }

  tx.commit().await?;
  Ok(())
}

pub async fn prune_old_events(pool: &SqlitePool, retain_raw_days: i64) -> Result<()> {
  let retain_raw_days = retain_raw_days.max(7);
  let cutoff = format_timestamp(Utc::now() - chrono::Duration::days(retain_raw_days));

  sqlx::query("DELETE FROM events WHERE timestamp < ?")
    .bind(&cutoff)
    .execute(pool)
    .await?;

  Ok(())
}

fn option_average(sum: i64, count: i64) -> Option<f64> {
  if count == 0 {
    None
  } else {
    Some(sum as f64 / count as f64)
  }
}

pub fn format_timestamp(timestamp: DateTime<Utc>) -> String {
  timestamp.to_rfc3339_opts(SecondsFormat::Millis, true)
}
