use std::{fs, path::PathBuf};

use anyhow::{Context, Result};
use directories::BaseDirs;

pub fn app_data_dir() -> Result<PathBuf> {
  let base_dirs =
    BaseDirs::new().context("failed to resolve the shared application data directory")?;
  Ok(base_dirs.data_dir().join("keyspeed"))
}

pub fn ensure_app_data_dir() -> Result<PathBuf> {
  let path = app_data_dir()?;
  fs::create_dir_all(&path)
    .with_context(|| format!("failed to create app data directory at {}", path.display()))?;
  Ok(path)
}

pub fn database_path() -> Result<PathBuf> {
  Ok(ensure_app_data_dir()?.join("keyspeed.sqlite"))
}

pub fn settings_path() -> Result<PathBuf> {
  Ok(ensure_app_data_dir()?.join("settings.json"))
}

pub fn runner_lock_path() -> Result<PathBuf> {
  Ok(ensure_app_data_dir()?.join("typing-runner.lock"))
}

pub fn runner_port_path() -> Result<PathBuf> {
  Ok(ensure_app_data_dir()?.join("typing-runner-port"))
}
