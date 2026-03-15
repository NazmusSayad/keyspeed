use std::fs;

use anyhow::{Context, Result};

use crate::{models::AppSettings, storage};

pub fn load() -> Result<AppSettings> {
  let path = storage::settings_path()?;

  if !path.exists() {
    return Ok(AppSettings::default());
  }

  let value = fs::read_to_string(&path)
    .with_context(|| format!("failed to read settings from {}", path.display()))?;

  Ok(serde_json::from_str(&value)?)
}

pub fn save(settings: &AppSettings) -> Result<AppSettings> {
  let path = storage::settings_path()?;
  let value = serde_json::to_string_pretty(settings)?;

  fs::write(&path, value)
    .with_context(|| format!("failed to write settings to {}", path.display()))?;

  Ok(settings.clone())
}
