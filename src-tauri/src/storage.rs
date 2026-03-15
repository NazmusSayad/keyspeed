use std::{
  fs,
  path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use directories::BaseDirs;

const APP_DIR_NAME: &str = "keyspeed";
const DATABASE_FILE_NAME: &str = "keyspeed.sqlite";
const SETTINGS_FILE_NAME: &str = "settings.json";
const SQLITE_WAL_FILE_NAME: &str = "keyspeed.sqlite-wal";
const SQLITE_SHM_FILE_NAME: &str = "keyspeed.sqlite-shm";

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
  cleanup_app_dir(&path)?;
  Ok(path)
}

pub fn database_path() -> Result<PathBuf> {
  Ok(ensure_app_dir()?.join(DATABASE_FILE_NAME))
}

pub fn settings_path() -> Result<PathBuf> {
  Ok(ensure_app_dir()?.join(SETTINGS_FILE_NAME))
}

fn cleanup_app_dir(app_dir: &Path) -> Result<()> {
  remove_wrong_roaming_dir(app_dir)?;

  for entry in fs::read_dir(app_dir)
    .with_context(|| format!("failed to read app directory at {}", app_dir.display()))?
  {
    let entry = entry?;
    let path = entry.path();
    if is_allowed_storage_entry(&path) {
      continue;
    }

    if path.is_dir() {
      fs::remove_dir_all(&path)
        .with_context(|| format!("failed to remove directory at {}", path.display()))?;
    } else {
      fs::remove_file(&path)
        .with_context(|| format!("failed to remove file at {}", path.display()))?;
    }
  }

  Ok(())
}

fn remove_wrong_roaming_dir(app_dir: &Path) -> Result<()> {
  let base_dirs =
    BaseDirs::new().context("failed to resolve the shared application config directory")?;
  let wrong_path = base_dirs.config_dir().join("Keyspeed");

  if same_path(app_dir, &wrong_path) || !wrong_path.exists() {
    return Ok(());
  }

  fs::remove_dir_all(&wrong_path)
    .with_context(|| format!("failed to remove directory at {}", wrong_path.display()))?;

  Ok(())
}

fn is_allowed_storage_entry(path: &Path) -> bool {
  let Some(file_name) = path.file_name().and_then(|name| name.to_str()) else {
    return false;
  };

  matches!(
    file_name,
    DATABASE_FILE_NAME | SETTINGS_FILE_NAME | SQLITE_WAL_FILE_NAME | SQLITE_SHM_FILE_NAME
  )
}

fn same_path(left: &Path, right: &Path) -> bool {
  if cfg!(target_os = "windows") {
    left
      .to_string_lossy()
      .eq_ignore_ascii_case(&right.to_string_lossy())
  } else {
    left == right
  }
}
