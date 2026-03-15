use std::{collections::HashMap, sync::Mutex};

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use rdev::{Event, EventType, Key};
use sqlx::SqlitePool;
use tokio::{sync::mpsc, time::Duration};

use crate::db::{self, EventKind, PendingEvent};

const FLUSH_BATCH_SIZE: usize = 64;
const FLUSH_INTERVAL_SECONDS: u64 = 2;

pub async fn run() -> Result<()> {
  let pool = db::connect_pool().await?;

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
  event_count: usize,
  key_down_started_at: HashMap<Key, DateTime<Utc>>,
  last_event_at: Option<DateTime<Utc>>,
}

impl EventTracker {
  fn new() -> Self {
    Self {
      event_count: 0,
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
    self.event_count += 1;

    Some(PendingEvent {
      timestamp,
      event_type,
      interval_ms,
      hold_duration_ms,
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
  match db::ingest_batch(pool, &batch).await {
    Ok(()) => Ok(()),
    Err(error) => {
      buffered_events.extend(batch);
      Err(error)
    }
  }
}
