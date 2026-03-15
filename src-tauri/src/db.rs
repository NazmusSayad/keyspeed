use std::{
    collections::{BTreeSet, HashMap},
    fs,
    path::PathBuf,
    time::Duration,
};

use anyhow::{Context, Result};
use chrono::{DateTime, SecondsFormat, Timelike, Utc};
use directories::ProjectDirs;
use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
    Executor, Row, SqlitePool,
};

use crate::models::{
    AppSettings, DailySummary, DashboardPayload, OverviewMetrics, ProductivityMetrics,
    RunnerStatus, SessionSummary, TimelinePoint,
};

const SETTINGS_KEY: &str = "app_settings";
const RUNNER_STALE_AFTER_SECONDS: i64 = 20;
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
    pub session_id: String,
    pub active_app_name: Option<String>,
}

#[derive(Debug, Default)]
struct AggregateBucket {
    key_count: i64,
    active_seconds: f64,
    interval_sum_ms: i64,
    interval_count: i64,
    hold_sum_ms: i64,
    hold_count: i64,
}

pub async fn connect_pool() -> Result<SqlitePool> {
    let path = database_path()?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).with_context(|| {
            format!("failed to create app data directory at {}", parent.display())
        })?;
    }

    let options = SqliteConnectOptions::new()
        .filename(&path)
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
        .busy_timeout(Duration::from_secs(5));

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .with_context(|| format!("failed to open sqlite database at {}", path.display()))?;

    pool.execute(sqlx::raw_sql(SCHEMA_SQL)).await?;
    ensure_defaults(&pool).await?;

    Ok(pool)
}

pub fn database_path() -> Result<PathBuf> {
    let project_dirs = ProjectDirs::from("com", "Keyspeed", "Keyspeed")
        .context("failed to resolve a shared application data directory")?;
    Ok(project_dirs.data_dir().join("keyspeed.sqlite"))
}

pub async fn load_settings(pool: &SqlitePool) -> Result<AppSettings> {
    let value = sqlx::query("SELECT value FROM settings WHERE key = ?")
        .bind(SETTINGS_KEY)
        .fetch_optional(pool)
        .await?;

    match value {
        Some(row) => Ok(serde_json::from_str::<AppSettings>(row.try_get("value")?)?),
        None => Ok(AppSettings::default()),
    }
}

pub async fn save_settings(pool: &SqlitePool, settings: &AppSettings) -> Result<AppSettings> {
    let value = serde_json::to_string(settings)?;

    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(SETTINGS_KEY)
    .bind(value)
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT INTO runner_state (id, autostart_enabled) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET autostart_enabled = excluded.autostart_enabled",
    )
    .bind(if settings.autostart_runner { 1_i64 } else { 0_i64 })
    .execute(pool)
    .await?;

    Ok(settings.clone())
}

pub async fn load_dashboard(pool: &SqlitePool) -> Result<DashboardPayload> {
    let now = Utc::now();
    let today = now.date_naive().to_string();
    let week_start = (now.date_naive() - chrono::Duration::days(6)).to_string();
    let last_24_hours = format_timestamp(now - chrono::Duration::hours(24));

    let totals = sqlx::query(
        "SELECT COALESCE(SUM(key_count), 0) AS total_keys, COALESCE(SUM(active_seconds), 0) AS total_active_seconds, COALESCE(SUM(interval_sum_ms), 0) AS interval_sum_ms, COALESCE(SUM(interval_count), 0) AS interval_count, COALESCE(SUM(hold_sum_ms), 0) AS hold_sum_ms, COALESCE(SUM(hold_count), 0) AS hold_count FROM daily_stats",
    )
    .fetch_one(pool)
    .await?;

    let today_row = sqlx::query(
        "SELECT key_count, active_seconds, total_session_ms FROM daily_stats WHERE day_date = ?",
    )
    .bind(&today)
    .fetch_optional(pool)
    .await?;

    let week_row = sqlx::query(
        "SELECT COALESCE(SUM(key_count), 0) AS key_count, COALESCE(SUM(active_seconds), 0) AS active_seconds, COALESCE(SUM(total_session_ms), 0) AS total_session_ms, COALESCE(SUM(burst_count), 0) AS burst_count, COALESCE(MAX(total_session_ms), 0) AS longest_session_ms, COALESCE(SUM(session_count), 0) AS session_count FROM daily_stats WHERE day_date >= ?",
    )
    .bind(&week_start)
    .fetch_one(pool)
    .await?;

    let active_days = sqlx::query(
        "SELECT COUNT(*) AS active_days FROM daily_stats WHERE day_date >= ? AND key_count > 0",
    )
    .bind(&week_start)
    .fetch_one(pool)
    .await?
    .try_get::<i64, _>("active_days")?;

    let timeline_rows = sqlx::query(
        "SELECT minute_timestamp, key_count, active_seconds, avg_interval_ms FROM minute_stats WHERE minute_timestamp >= ? ORDER BY minute_timestamp ASC",
    )
    .bind(&last_24_hours)
    .fetch_all(pool)
    .await?;

    let daily_rows = sqlx::query(
        "SELECT day_date, key_count, active_seconds, session_count, burst_count FROM daily_stats ORDER BY day_date DESC LIMIT 14",
    )
    .fetch_all(pool)
    .await?;

    let session_rows = sqlx::query(
        "SELECT id, started_at, ended_at, duration_ms, key_down_count, avg_interval_ms, avg_hold_duration_ms FROM sessions ORDER BY started_at DESC LIMIT 12",
    )
    .fetch_all(pool)
    .await?;

    let last_updated_at = sqlx::query("SELECT last_flush_at FROM runner_state WHERE id = 1")
        .fetch_optional(pool)
        .await?
        .and_then(|row| row.try_get::<Option<String>, _>("last_flush_at").ok())
        .flatten();

    let total_key_presses = totals.try_get::<i64, _>("total_keys")?;
    let total_active_seconds = totals.try_get::<f64, _>("total_active_seconds")?;
    let interval_sum_ms = totals.try_get::<i64, _>("interval_sum_ms")?;
    let interval_count = totals.try_get::<i64, _>("interval_count")?;
    let hold_sum_ms = totals.try_get::<i64, _>("hold_sum_ms")?;
    let hold_count = totals.try_get::<i64, _>("hold_count")?;

    let today_keys = today_row
        .as_ref()
        .map(|row| row.try_get::<i64, _>("key_count"))
        .transpose()?
        .unwrap_or_default();
    let today_active_seconds = today_row
        .as_ref()
        .map(|row| row.try_get::<f64, _>("active_seconds"))
        .transpose()?
        .unwrap_or_default();
    let today_total_session_ms = today_row
        .as_ref()
        .map(|row| row.try_get::<i64, _>("total_session_ms"))
        .transpose()?
        .unwrap_or_default();
    let today_keys_per_minute = if today_keys == 0 {
        0.0
    } else {
        today_keys as f64 / (today_active_seconds / 60.0).max(1.0)
    };
    let estimated_wpm = today_keys_per_minute / 5.0;

    let week_keys = week_row.try_get::<i64, _>("key_count")?;
    let week_total_session_ms = week_row.try_get::<i64, _>("total_session_ms")?;
    let week_burst_count = week_row.try_get::<i64, _>("burst_count")?;
    let longest_session_minutes = week_row.try_get::<i64, _>("longest_session_ms")? as f64 / 60_000.0;
    let session_count = week_row.try_get::<i64, _>("session_count")?;
    let average_session_minutes = if session_count == 0 {
        0.0
    } else {
        week_total_session_ms as f64 / session_count as f64 / 60_000.0
    };
    let idle_seconds = ((today_total_session_ms as f64 / 1_000.0) - today_active_seconds).max(0.0);
    let consistency_score = ((active_days as f64 / 7.0) * 100.0).clamp(0.0, 100.0);
    let focus_score = ((week_keys as f64 / 3_500.0).min(1.0) * 40.0
        + (average_session_minutes / 18.0).min(1.0) * 30.0
        + (active_days as f64 / 7.0).min(1.0) * 30.0)
        .clamp(0.0, 100.0);

    let overview = OverviewMetrics {
        total_key_presses,
        today_keys,
        today_keys_per_minute,
        estimated_wpm,
        week_keys,
        average_interval_ms: option_average(interval_sum_ms, interval_count),
        average_hold_duration_ms: option_average(hold_sum_ms, hold_count),
        active_seconds: total_active_seconds,
        idle_seconds,
    };

    let timeline = timeline_rows
        .into_iter()
        .map(|row| TimelinePoint {
            timestamp: row.try_get("minute_timestamp").unwrap_or_default(),
            key_count: row.try_get("key_count").unwrap_or_default(),
            active_seconds: row.try_get("active_seconds").unwrap_or_default(),
            average_interval_ms: row.try_get("avg_interval_ms").ok(),
        })
        .collect();

    let mut daily_summaries: Vec<_> = daily_rows
        .into_iter()
        .map(|row| {
            let key_count = row.try_get::<i64, _>("key_count").unwrap_or_default();
            let active_seconds = row.try_get::<f64, _>("active_seconds").unwrap_or_default();

            DailySummary {
                date: row.try_get("day_date").unwrap_or_default(),
                key_count,
                active_seconds,
                estimated_wpm: if key_count == 0 {
                    0.0
                } else {
                    (key_count as f64 / (active_seconds / 60.0).max(1.0)) / 5.0
                },
                session_count: row.try_get("session_count").unwrap_or_default(),
                burst_count: row.try_get("burst_count").unwrap_or_default(),
            }
        })
        .collect();
    daily_summaries.reverse();

    let recent_sessions = session_rows
        .into_iter()
        .map(|row| SessionSummary {
            id: row.try_get("id").unwrap_or_default(),
            started_at: row.try_get("started_at").unwrap_or_default(),
            ended_at: row.try_get("ended_at").unwrap_or_default(),
            duration_minutes: row.try_get::<i64, _>("duration_ms").unwrap_or_default() as f64
                / 60_000.0,
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

pub async fn load_runner_status(
    pool: &SqlitePool,
    autostart_configured: bool,
) -> Result<RunnerStatus> {
    let row = sqlx::query(
        "SELECT last_heartbeat_at, last_flush_at, last_started_at, last_error FROM runner_state WHERE id = 1",
    )
    .fetch_optional(pool)
    .await?;

    let last_heartbeat_at = row
        .as_ref()
        .map(|value| value.try_get::<Option<String>, _>("last_heartbeat_at"))
        .transpose()?
        .flatten();
    let is_running = last_heartbeat_at
        .as_deref()
        .and_then(|value| parse_timestamp(value).ok())
        .map(|value| Utc::now().signed_duration_since(value).num_seconds() <= RUNNER_STALE_AFTER_SECONDS)
        .unwrap_or(false);

    Ok(RunnerStatus {
        is_running,
        autostart_configured,
        stale_after_seconds: RUNNER_STALE_AFTER_SECONDS,
        last_heartbeat_at,
        last_flush_at: row
            .as_ref()
            .map(|value| value.try_get::<Option<String>, _>("last_flush_at"))
            .transpose()?
            .flatten(),
        last_started_at: row
            .as_ref()
            .map(|value| value.try_get::<Option<String>, _>("last_started_at"))
            .transpose()?
            .flatten(),
        last_error: row
            .as_ref()
            .map(|value| value.try_get::<Option<String>, _>("last_error"))
            .transpose()?
            .flatten(),
    })
}

pub async fn mark_runner_started(pool: &SqlitePool) -> Result<()> {
    let now = format_timestamp(Utc::now());
    sqlx::query(
        "INSERT INTO runner_state (id, last_started_at, last_heartbeat_at, last_error, runner_version, pid) VALUES (1, ?, ?, NULL, ?, ?) ON CONFLICT(id) DO UPDATE SET last_started_at = excluded.last_started_at, last_heartbeat_at = excluded.last_heartbeat_at, last_error = NULL, runner_version = excluded.runner_version, pid = excluded.pid",
    )
    .bind(&now)
    .bind(&now)
    .bind(env!("CARGO_PKG_VERSION"))
    .bind(std::process::id() as i64)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn touch_runner_heartbeat(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        "INSERT INTO runner_state (id, last_heartbeat_at) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last_heartbeat_at = excluded.last_heartbeat_at",
    )
    .bind(format_timestamp(Utc::now()))
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn touch_runner_flush(pool: &SqlitePool) -> Result<()> {
    let now = format_timestamp(Utc::now());
    sqlx::query(
        "INSERT INTO runner_state (id, last_flush_at, last_heartbeat_at, last_error) VALUES (1, ?, ?, NULL) ON CONFLICT(id) DO UPDATE SET last_flush_at = excluded.last_flush_at, last_heartbeat_at = excluded.last_heartbeat_at, last_error = NULL",
    )
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn set_runner_error(pool: &SqlitePool, error: impl AsRef<str>) -> Result<()> {
    sqlx::query(
        "INSERT INTO runner_state (id, last_error, last_heartbeat_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET last_error = excluded.last_error, last_heartbeat_at = excluded.last_heartbeat_at",
    )
    .bind(error.as_ref())
    .bind(format_timestamp(Utc::now()))
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn ingest_batch(pool: &SqlitePool, events: &[PendingEvent], retain_raw_days: i64) -> Result<()> {
    if events.is_empty() {
        return Ok(());
    }

    let mut tx = pool.begin().await?;
    let mut minute_buckets: HashMap<String, AggregateBucket> = HashMap::new();
    let mut session_ids = BTreeSet::new();
    let mut day_buckets = BTreeSet::new();

    for event in events {
        sqlx::query(
            "INSERT INTO events (timestamp, event_type, interval_ms, hold_duration_ms, session_id, active_app_name) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(format_timestamp(event.timestamp))
        .bind(event.event_type.as_str())
        .bind(event.interval_ms)
        .bind(event.hold_duration_ms)
        .bind(&event.session_id)
        .bind(&event.active_app_name)
        .execute(&mut *tx)
        .await?;

        let bucket = minute_buckets.entry(minute_bucket(event.timestamp)).or_default();
        if matches!(event.event_type, EventKind::Down) {
            bucket.key_count += 1;
        }
        if let Some(interval_ms) = event.interval_ms {
            bucket.interval_sum_ms += interval_ms;
            bucket.interval_count += 1;
            bucket.active_seconds += (interval_ms.clamp(0, 1_000) as f64) / 1_000.0;
        }
        if let Some(hold_duration_ms) = event.hold_duration_ms {
            bucket.hold_sum_ms += hold_duration_ms;
            bucket.hold_count += 1;
        }

        session_ids.insert(event.session_id.clone());
        day_buckets.insert(day_bucket(event.timestamp));
    }

    for (minute_timestamp, bucket) in minute_buckets {
        let burst_flag = if bucket.key_count >= 45
            || option_average(bucket.interval_sum_ms, bucket.interval_count)
                .map(|value| value <= 170.0)
                .unwrap_or(false)
        {
            1_i64
        } else {
            0_i64
        };

        sqlx::query(
            "INSERT INTO minute_stats (minute_timestamp, key_count, active_seconds, avg_interval_ms, avg_hold_duration_ms, interval_sum_ms, interval_count, hold_sum_ms, hold_count, burst_flag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(minute_timestamp) DO UPDATE SET key_count = minute_stats.key_count + excluded.key_count, active_seconds = minute_stats.active_seconds + excluded.active_seconds, interval_sum_ms = minute_stats.interval_sum_ms + excluded.interval_sum_ms, interval_count = minute_stats.interval_count + excluded.interval_count, hold_sum_ms = minute_stats.hold_sum_ms + excluded.hold_sum_ms, hold_count = minute_stats.hold_count + excluded.hold_count, avg_interval_ms = CASE WHEN minute_stats.interval_count + excluded.interval_count = 0 THEN NULL ELSE CAST(minute_stats.interval_sum_ms + excluded.interval_sum_ms AS REAL) / CAST(minute_stats.interval_count + excluded.interval_count AS REAL) END, avg_hold_duration_ms = CASE WHEN minute_stats.hold_count + excluded.hold_count = 0 THEN NULL ELSE CAST(minute_stats.hold_sum_ms + excluded.hold_sum_ms AS REAL) / CAST(minute_stats.hold_count + excluded.hold_count AS REAL) END, burst_flag = CASE WHEN minute_stats.key_count + excluded.key_count >= 45 OR CASE WHEN minute_stats.interval_count + excluded.interval_count = 0 THEN 0 ELSE CAST(minute_stats.interval_sum_ms + excluded.interval_sum_ms AS REAL) / CAST(minute_stats.interval_count + excluded.interval_count AS REAL) <= 170 END THEN 1 ELSE 0 END",
        )
        .bind(&minute_timestamp)
        .bind(bucket.key_count)
        .bind(bucket.active_seconds)
        .bind(option_average(bucket.interval_sum_ms, bucket.interval_count))
        .bind(option_average(bucket.hold_sum_ms, bucket.hold_count))
        .bind(bucket.interval_sum_ms)
        .bind(bucket.interval_count)
        .bind(bucket.hold_sum_ms)
        .bind(bucket.hold_count)
        .bind(burst_flag)
        .execute(&mut *tx)
        .await?;
    }

    for session_id in session_ids {
        sqlx::query(
            "INSERT INTO sessions (id, started_at, ended_at, duration_ms, key_down_count, avg_interval_ms, avg_hold_duration_ms) SELECT session_id, MIN(timestamp), MAX(timestamp), COALESCE(MAX(CAST(strftime('%s', timestamp) AS INTEGER) * 1000) - MIN(CAST(strftime('%s', timestamp) AS INTEGER) * 1000), 0), SUM(CASE WHEN event_type = 'down' THEN 1 ELSE 0 END), AVG(interval_ms), AVG(hold_duration_ms) FROM events WHERE session_id = ? GROUP BY session_id ON CONFLICT(id) DO UPDATE SET started_at = excluded.started_at, ended_at = excluded.ended_at, duration_ms = excluded.duration_ms, key_down_count = excluded.key_down_count, avg_interval_ms = excluded.avg_interval_ms, avg_hold_duration_ms = excluded.avg_hold_duration_ms",
        )
        .bind(&session_id)
        .execute(&mut *tx)
        .await?;
    }

    for day in day_buckets {
        sqlx::query(
            "INSERT INTO daily_stats (day_date, key_count, active_seconds, avg_interval_ms, avg_hold_duration_ms, session_count, total_session_ms, burst_count, interval_sum_ms, interval_count, hold_sum_ms, hold_count) SELECT ?, COALESCE(SUM(key_count), 0), COALESCE(SUM(active_seconds), 0), CASE WHEN COALESCE(SUM(interval_count), 0) = 0 THEN NULL ELSE CAST(SUM(interval_sum_ms) AS REAL) / CAST(SUM(interval_count) AS REAL) END, CASE WHEN COALESCE(SUM(hold_count), 0) = 0 THEN NULL ELSE CAST(SUM(hold_sum_ms) AS REAL) / CAST(SUM(hold_count) AS REAL) END, (SELECT COUNT(*) FROM sessions WHERE substr(started_at, 1, 10) = ?), (SELECT COALESCE(SUM(duration_ms), 0) FROM sessions WHERE substr(started_at, 1, 10) = ?), COALESCE(SUM(burst_flag), 0), COALESCE(SUM(interval_sum_ms), 0), COALESCE(SUM(interval_count), 0), COALESCE(SUM(hold_sum_ms), 0), COALESCE(SUM(hold_count), 0) FROM minute_stats WHERE substr(minute_timestamp, 1, 10) = ? ON CONFLICT(day_date) DO UPDATE SET key_count = excluded.key_count, active_seconds = excluded.active_seconds, avg_interval_ms = excluded.avg_interval_ms, avg_hold_duration_ms = excluded.avg_hold_duration_ms, session_count = excluded.session_count, total_session_ms = excluded.total_session_ms, burst_count = excluded.burst_count, interval_sum_ms = excluded.interval_sum_ms, interval_count = excluded.interval_count, hold_sum_ms = excluded.hold_sum_ms, hold_count = excluded.hold_count",
        )
        .bind(&day)
        .bind(&day)
        .bind(&day)
        .bind(&day)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    touch_runner_flush(pool).await?;
    prune_old_events(pool, retain_raw_days).await?;
    Ok(())
}

pub async fn prune_old_events(pool: &SqlitePool, retain_raw_days: i64) -> Result<()> {
    let retain_raw_days = retain_raw_days.max(7);
    let cutoff = format_timestamp(Utc::now() - chrono::Duration::days(retain_raw_days));

    sqlx::query("DELETE FROM events WHERE timestamp < ?")
        .bind(&cutoff)
        .execute(pool)
        .await?;

    sqlx::query("DELETE FROM sessions WHERE ended_at < ?")
        .bind(&cutoff)
        .execute(pool)
        .await?;

    Ok(())
}

async fn ensure_defaults(pool: &SqlitePool) -> Result<()> {
    sqlx::query("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)")
        .bind(SETTINGS_KEY)
        .bind(serde_json::to_string(&AppSettings::default())?)
        .execute(pool)
        .await?;

    sqlx::query("INSERT OR IGNORE INTO runner_state (id, autostart_enabled) VALUES (1, 1)")
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

fn minute_bucket(timestamp: DateTime<Utc>) -> String {
    timestamp
        .with_second(0)
        .and_then(|value| value.with_nanosecond(0))
        .unwrap_or(timestamp)
        .to_rfc3339_opts(SecondsFormat::Secs, true)
}

fn day_bucket(timestamp: DateTime<Utc>) -> String {
    timestamp.date_naive().to_string()
}

fn parse_timestamp(value: &str) -> Result<DateTime<Utc>> {
    Ok(DateTime::parse_from_rfc3339(value)?.with_timezone(&Utc))
}

pub fn format_timestamp(timestamp: DateTime<Utc>) -> String {
    timestamp.to_rfc3339_opts(SecondsFormat::Millis, true)
}
