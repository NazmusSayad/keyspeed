use std::{collections::HashMap, fs::OpenOptions, sync::Mutex};

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use fs2::FileExt;
use rdev::{Event, EventType, Key};
use sqlx::SqlitePool;
use tokio::{
  io::{AsyncReadExt, AsyncWriteExt},
  net::TcpListener,
  sync::mpsc,
  time::Duration,
};

use crate::{
  db::{self, EventKind, PendingEvent},
  storage,
};

const FLUSH_BATCH_SIZE: usize = 64;
const FLUSH_INTERVAL_SECONDS: u64 = 2;

pub async fn run() -> Result<()> {
  let pool = db::connect_pool().await?;
  let _instance_guard = acquire_single_instance_lock()?;
  let _ping_guard = PingServerGuard::start().await?;

  let (sender, receiver) = mpsc::unbounded_channel();

  tokio::spawn(flush_loop(pool.clone(), receiver));

  let listener_sender = sender.clone();
  let listener = tokio::task::spawn_blocking(move || {
    let tracker = Mutex::new(EventTracker::new());

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
    return Err(anyhow::anyhow!(format!("{error:?}")));
  }

  Ok(())
}

struct EventTracker {
  key_down_started_at: HashMap<Key, DateTime<Utc>>,
  last_event_at: Option<DateTime<Utc>>,
}

impl EventTracker {
  fn new() -> Self {
    Self {
      key_down_started_at: HashMap::new(),
      last_event_at: None,
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
        let hold_duration_ms = self.key_down_started_at.remove(&key).map(|value| {
          timestamp
            .signed_duration_since(value)
            .num_milliseconds()
            .max(0)
        });
        (EventKind::Up, hold_duration_ms)
      }
      _ => return None,
    };

    let interval_ms = self.last_event_at.map(|value| {
      timestamp
        .signed_duration_since(value)
        .num_milliseconds()
        .max(0)
    });

    self.last_event_at = Some(timestamp);

    Some(PendingEvent {
      timestamp,
      event_type,
      interval_ms,
      hold_duration_ms,
      active_app_name: None,
    })
  }
}

async fn flush_loop(pool: SqlitePool, mut receiver: mpsc::UnboundedReceiver<PendingEvent>) {
  let mut buffered_events = Vec::new();
  let mut ticker = tokio::time::interval(Duration::from_secs(FLUSH_INTERVAL_SECONDS));

  loop {
    tokio::select! {
        maybe_event = receiver.recv() => {
            match maybe_event {
                Some(event) => {
                    buffered_events.push(event);
                    if buffered_events.len() >= FLUSH_BATCH_SIZE {
                        let _ = flush_buffer(&pool, &mut buffered_events).await;
                    }
                }
                None => break,
            }
        }
        _ = ticker.tick() => {
            if !buffered_events.is_empty() {
                let _ = flush_buffer(&pool, &mut buffered_events).await;
            }
        }
    }
  }

  if !buffered_events.is_empty() {
    let _ = flush_buffer(&pool, &mut buffered_events).await;
  }
}

async fn flush_buffer(pool: &SqlitePool, buffered_events: &mut Vec<PendingEvent>) -> Result<()> {
  let batch = std::mem::take(buffered_events);
  db::ingest_batch(pool, &batch).await
}

fn acquire_single_instance_lock() -> Result<SingleInstanceGuard> {
  let path = storage::runner_lock_path()?;
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

  file
    .try_lock_exclusive()
    .with_context(|| "another typing-runner instance is already active")?;

  Ok(SingleInstanceGuard { file })
}

struct SingleInstanceGuard {
  file: std::fs::File,
}

impl Drop for SingleInstanceGuard {
  fn drop(&mut self) {
    let _ = self.file.unlock();
  }
}

struct PingServerGuard {
  port_path: std::path::PathBuf,
}

impl PingServerGuard {
  async fn start() -> Result<Self> {
    let listener = TcpListener::bind("127.0.0.1:0").await?;
    let port = listener.local_addr()?.port();
    let port_path = storage::runner_port_path()?;
    std::fs::write(&port_path, port.to_string())?;

    tokio::spawn(async move {
      loop {
        let Ok((mut stream, _)) = listener.accept().await else {
          break;
        };

        let mut buffer = [0_u8; 4];
        if stream.read_exact(&mut buffer).await.is_ok() && &buffer == b"ping" {
          let _ = stream.write_all(b"pong").await;
        }
      }
    });

    Ok(Self { port_path })
  }
}

impl Drop for PingServerGuard {
  fn drop(&mut self) {
    let _ = std::fs::remove_file(&self.port_path);
  }
}
