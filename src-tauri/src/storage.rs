use std::{fs, path::PathBuf};

use anyhow::{Context, Result};
use directories::BaseDirs;

const APP_DIR_NAME: &str = "keyspeed";
const DATABASE_FILE_NAME: &str = "keyspeed.sqlite";
const SETTINGS_FILE_NAME: &str = "settings.json";

pub fn app_dir() -> Result<PathBuf> {
  let base_dirs =
    BaseDirs::new().context("failed to resolve the shared application config directory")?;
  Ok(base_dirs.config_dir().join(APP_DIR_NAME))
}

pub fn ensure_app_dir() -> Result<PathBuf> {
  let path = app_dir()?;
  fs::create_dir_all(&path).with_context(|| {
    format!(
      "failed to create app config directory at {}",
      path.display()
    )
  })?;
  Ok(path)
}

pub fn database_path() -> Result<PathBuf> {
  Ok(ensure_app_dir()?.join(DATABASE_FILE_NAME))
}

pub fn settings_path() -> Result<PathBuf> {
  Ok(ensure_app_dir()?.join(SETTINGS_FILE_NAME))
}
