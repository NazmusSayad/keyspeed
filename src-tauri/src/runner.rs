use std::{
    collections::HashMap,
    fs::OpenOptions,
    path::PathBuf,
    sync::{Arc, Mutex, RwLock},
};

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use fs2::FileExt;
use rdev::{Event, EventType, Key};
use sqlx::SqlitePool;
use tokio::{sync::mpsc, time::Duration};
use uuid::Uuid;

use crate::{
    db::{self, EventKind, PendingEvent},
    models::AppSettings,
};

const FLUSH_BATCH_SIZE: usize = 64;
const FLUSH_INTERVAL_SECONDS: u64 = 2;
const HEARTBEAT_INTERVAL_SECONDS: u64 = 10;

pub async fn run() -> Result<()> {
    let pool = db::connect_pool().await?;
    let settings = Arc::new(RwLock::new(db::load_settings(&pool).await?));
    let _instance_guard = acquire_single_instance_lock()?;

    db::mark_runner_started(&pool).await?;
    db::touch_runner_heartbeat(&pool).await?;

    let (sender, receiver) = mpsc::unbounded_channel();

    tokio::spawn(flush_loop(pool.clone(), receiver, Arc::clone(&settings)));
    tokio::spawn(heartbeat_loop(pool.clone(), Arc::clone(&settings)));

    let listener_settings = Arc::clone(&settings);
    let listener_sender = sender.clone();

    let listener = tokio::task::spawn_blocking(move || {
        let tracker = Mutex::new(EventTracker::new(listener_settings));

        rdev::listen(move |event| {
            if let Ok(mut tracker) = tracker.lock() {
                if let Some(event) = tracker.handle_event(event) {
                    let _ = listener_sender.send(event);
                }
            }
        })
    })
    .await
    .context("runner listener thread panicked")?;

    if let Err(error) = listener {
        let error_message = format!("{error:?}");
        db::set_runner_error(&pool, &error_message).await?;
        return Err(anyhow::anyhow!(error_message));
    }

    Ok(())
}

struct EventTracker {
    active_session_id: String,
    key_down_started_at: HashMap<Key, DateTime<Utc>>,
    last_event_at: Option<DateTime<Utc>>,
    settings: Arc<RwLock<AppSettings>>,
}

impl EventTracker {
    fn new(settings: Arc<RwLock<AppSettings>>) -> Self {
        Self {
            active_session_id: new_session_id(),
            key_down_started_at: HashMap::new(),
            last_event_at: None,
            settings,
        }
    }

    fn handle_event(&mut self, event: Event) -> Option<PendingEvent> {
        let timestamp = Utc::now();
        let (event_type, hold_duration_ms) = match event.event_type {
            EventType::KeyPress(key) => {
                self.key_down_started_at.insert(key, timestamp);
                (EventKind::Down, None)
            }
            EventType::KeyRelease(key) => {
                let hold_duration_ms = self
                    .key_down_started_at
                    .remove(&key)
                    .map(|value| timestamp.signed_duration_since(value).num_milliseconds().max(0));
                (EventKind::Up, hold_duration_ms)
            }
            _ => return None,
        };

        let idle_timeout_ms = self
            .settings
            .read()
            .ok()
            .map(|value| value.idle_timeout_seconds as i64 * 1_000)
            .unwrap_or(5_000);
        let interval_ms = self
            .last_event_at
            .map(|value| timestamp.signed_duration_since(value).num_milliseconds().max(0));

        if interval_ms.unwrap_or_default() > idle_timeout_ms {
            self.active_session_id = new_session_id();
        }

        self.last_event_at = Some(timestamp);

        Some(PendingEvent {
            timestamp,
            event_type,
            interval_ms,
            hold_duration_ms,
            session_id: self.active_session_id.clone(),
            active_app_name: None,
        })
    }
}

async fn flush_loop(
    pool: SqlitePool,
    mut receiver: mpsc::UnboundedReceiver<PendingEvent>,
    settings: Arc<RwLock<AppSettings>>,
) {
    let mut buffered_events = Vec::new();
    let mut ticker = tokio::time::interval(Duration::from_secs(FLUSH_INTERVAL_SECONDS));

    loop {
        tokio::select! {
            maybe_event = receiver.recv() => {
                match maybe_event {
                    Some(event) => {
                        buffered_events.push(event);
                        if buffered_events.len() >= FLUSH_BATCH_SIZE {
                            if let Err(error) = flush_buffer(&pool, &mut buffered_events, &settings).await {
                                let _ = db::set_runner_error(&pool, error.to_string()).await;
                            }
                        }
                    }
                    None => break,
                }
            }
            _ = ticker.tick() => {
                if !buffered_events.is_empty() {
                    if let Err(error) = flush_buffer(&pool, &mut buffered_events, &settings).await {
                        let _ = db::set_runner_error(&pool, error.to_string()).await;
                    }
                }
            }
        }
    }
}

async fn flush_buffer(
    pool: &SqlitePool,
    buffered_events: &mut Vec<PendingEvent>,
    settings: &Arc<RwLock<AppSettings>>,
) -> Result<()> {
    let retain_raw_days = settings
        .read()
        .map(|value| value.retain_raw_days)
        .unwrap_or(30);
    let batch = std::mem::take(buffered_events);
    db::ingest_batch(pool, &batch, retain_raw_days).await
}

async fn heartbeat_loop(pool: SqlitePool, settings: Arc<RwLock<AppSettings>>) {
    let mut ticker = tokio::time::interval(Duration::from_secs(HEARTBEAT_INTERVAL_SECONDS));
    let mut iteration = 0_u64;

    loop {
        ticker.tick().await;
        if let Ok(fresh_settings) = db::load_settings(&pool).await {
            if let Ok(mut stored_settings) = settings.write() {
                *stored_settings = fresh_settings.clone();
            }
            if iteration.is_multiple_of(36) {
                let _ = db::prune_old_events(&pool, fresh_settings.retain_raw_days).await;
            }
        }
        let _ = db::touch_runner_heartbeat(&pool).await;
        iteration = iteration.saturating_add(1);
    }
}

fn acquire_single_instance_lock() -> Result<SingleInstanceGuard> {
    let path = lock_file_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(&path)
        .with_context(|| format!("failed to open runner lock file at {}", path.display()))?;

    file.try_lock_exclusive()
        .with_context(|| "another typing-runner instance is already active")?;

    Ok(SingleInstanceGuard { file })
}

fn lock_file_path() -> Result<PathBuf> {
    Ok(db::database_path()?
        .parent()
        .context("database path has no parent directory")?
        .join("typing-runner.lock"))
}

fn new_session_id() -> String {
    Uuid::new_v4().to_string()
}

struct SingleInstanceGuard {
    file: std::fs::File,
}

impl Drop for SingleInstanceGuard {
    fn drop(&mut self) {
        let _ = self.file.unlock();
    }
}
