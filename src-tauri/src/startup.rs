use std::{
  env,
  path::{Path, PathBuf},
  process::Stdio,
};

use anyhow::{Context, Result};
use sysinfo::{ProcessesToUpdate, Signal, System};
use tauri::{AppHandle, Manager};
use tokio::time::{sleep, Duration};

use crate::models::{PermissionHint, RunnerStatus};

#[cfg(any(target_os = "macos", target_os = "linux"))]
use std::fs;

#[cfg(any(target_os = "macos", target_os = "linux"))]
use directories::BaseDirs;

const AUTOSTART_NAME: &str = "KeyspeedRunner";

pub fn permission_hint() -> PermissionHint {
  #[cfg(target_os = "macos")]
  {
    return PermissionHint {
            required: true,
            title: "Accessibility access is required on macOS".to_string(),
            body: "Grant Keyspeed Accessibility permission in System Settings so the runner can observe keyboard metadata without reading the text you type.".to_string(),
            action_label: Some("Open Accessibility settings".to_string()),
            action_url: Some(
                "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
                    .to_string(),
            ),
        };
  }

  PermissionHint {
    required: false,
    title: "No extra keyboard permission is required on this platform".to_string(),
    body:
      "Keyspeed tracks timing metadata only and never stores actual key values or typed content."
        .to_string(),
    action_label: None,
    action_url: None,
  }
}

pub async fn start_runner(app: &AppHandle) -> Result<()> {
  let runner_path = resolve_runner_path(app).context("failed to resolve typing-runner")?;
  let mut command = std::process::Command::new(&runner_path);

  command
    .stdin(Stdio::null())
    .stdout(Stdio::null())
    .stderr(Stdio::null());

  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;

    command.creation_flags(0x0800_0000);
  }

  command
    .spawn()
    .with_context(|| format!("failed to start runner at {}", runner_path.display()))?;

  Ok(())
}

pub async fn wait_for_runner(app: &AppHandle) -> Result<()> {
  for _ in 0..20 {
    if is_runner_process_running(app)? {
      return Ok(());
    }
    sleep(Duration::from_millis(200)).await;
  }

  Err(anyhow::anyhow!("runner did not become responsive in time"))
}

pub async fn load_runner_status(app: &AppHandle) -> Result<RunnerStatus> {
  let autostart_configured = is_runner_autostart_configured(app).unwrap_or(false);
  let is_running = is_runner_process_running(app)?;

  Ok(RunnerStatus {
    is_running,
    autostart_configured,
  })
}

pub async fn stop_runner(app: &AppHandle) -> Result<RunnerStatus> {
  let runner_path = resolve_runner_path(app).context("failed to resolve typing-runner")?;
  stop_runner_processes(&runner_path)?;
  wait_for_runner_exit(app).await?;
  load_runner_status(app).await
}

pub async fn restart_runner(app: &AppHandle) -> Result<RunnerStatus> {
  let _ = stop_runner(app).await?;
  start_runner(app).await?;
  wait_for_runner(app).await?;
  load_runner_status(app).await
}

pub fn resolve_runner_path(app: &AppHandle) -> Option<PathBuf> {
  let binary_name = if cfg!(target_os = "windows") {
    "typing-runner.exe"
  } else {
    "typing-runner"
  };
  let mut candidates = Vec::new();

  if let Ok(current_dir) = env::current_dir() {
    candidates.push(
      current_dir
        .join("src-tauri")
        .join("runner-target")
        .join("debug")
        .join(binary_name),
    );
    candidates.push(
      current_dir
        .join("src-tauri")
        .join("runner-target")
        .join("release")
        .join(binary_name),
    );
  }

  if let Ok(current_exe) = env::current_exe() {
    if let Some(directory) = current_exe.parent() {
      candidates.push(directory.join(binary_name));

      #[cfg(target_os = "macos")]
      if let Some(contents_dir) = directory.parent() {
        candidates.push(contents_dir.join("Resources").join(binary_name));
      }
    }
  }

  if let Ok(resource_dir) = app.path().resource_dir() {
    candidates.push(resource_dir.join(binary_name));
  }

  if let Ok(current_dir) = env::current_dir() {
    candidates.push(
      current_dir
        .join("src-tauri")
        .join("target")
        .join("debug")
        .join(binary_name),
    );
    candidates.push(
      current_dir
        .join("src-tauri")
        .join("target")
        .join("release")
        .join(binary_name),
    );
  }

  candidates.into_iter().find(|path| path.exists())
}

pub fn sync_runner_autostart(app: &AppHandle, enabled: bool) -> Result<bool> {
  let runner_path = resolve_runner_path(app).context("failed to resolve runner for autostart")?;

  #[cfg(target_os = "windows")]
  {
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (run_key, _) = hkcu.create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")?;

    if enabled {
      run_key.set_value(AUTOSTART_NAME, &format!("\"{}\"", runner_path.display()))?;
    } else {
      let _ = run_key.delete_value(AUTOSTART_NAME);
    }

    return Ok(is_runner_autostart_configured(app).unwrap_or(false));
  }

  #[cfg(target_os = "macos")]
  {
    let path = launch_agent_path()?;
    if enabled {
      if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
      }
      fs::write(
                &path,
                format!(
                    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n<plist version=\"1.0\">\n<dict>\n  <key>Label</key>\n  <string>com.keyspeed.typing-runner</string>\n  <key>ProgramArguments</key>\n  <array>\n    <string>{}</string>\n  </array>\n  <key>RunAtLoad</key>\n  <true/>\n</dict>\n</plist>\n",
                    xml_escape(&runner_path.display().to_string())
                ),
            )?;
    } else if path.exists() {
      fs::remove_file(path)?;
    }

    return Ok(is_runner_autostart_configured(app).unwrap_or(false));
  }

  #[cfg(target_os = "linux")]
  {
    let path = linux_autostart_path()?;
    if enabled {
      if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
      }
      fs::write(
                &path,
                format!(
                    "[Desktop Entry]\nType=Application\nName=Keyspeed Runner\nExec={}\nX-GNOME-Autostart-enabled=true\n",
                    runner_path.display()
                ),
            )?;
    } else if path.exists() {
      fs::remove_file(path)?;
    }

    return Ok(is_runner_autostart_configured(app).unwrap_or(false));
  }

  #[allow(unreachable_code)]
  Ok(false)
}

pub fn is_runner_autostart_configured(app: &AppHandle) -> Result<bool> {
  let Some(runner_path) = resolve_runner_path(app) else {
    return Ok(false);
  };

  #[cfg(target_os = "windows")]
  {
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run_key = hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")?;
    let value: String = match run_key.get_value(AUTOSTART_NAME) {
      Ok(value) => value,
      Err(_) => return Ok(false),
    };
    return Ok(value.contains(&runner_path.display().to_string()));
  }

  #[cfg(target_os = "macos")]
  {
    let path = launch_agent_path()?;
    return Ok(
      path.exists() && fs::read_to_string(path)?.contains(&runner_path.display().to_string()),
    );
  }

  #[cfg(target_os = "linux")]
  {
    let path = linux_autostart_path()?;
    return Ok(
      path.exists() && fs::read_to_string(path)?.contains(&runner_path.display().to_string()),
    );
  }

  #[allow(unreachable_code)]
  Ok(false)
}

async fn wait_for_runner_exit(app: &AppHandle) -> Result<()> {
  for _ in 0..20 {
    if !is_runner_process_running(app)? {
      return Ok(());
    }
    sleep(Duration::from_millis(200)).await;
  }

  Err(anyhow::anyhow!("runner did not stop in time"))
}

fn is_runner_process_running(app: &AppHandle) -> Result<bool> {
  Ok(!runner_process_ids(app)?.is_empty())
}

fn runner_process_ids(app: &AppHandle) -> Result<Vec<sysinfo::Pid>> {
  let runner_path = resolve_runner_path(app).context("failed to resolve typing-runner")?;
  let runner_path = normalize_path(&runner_path)?;
  let current_pid = std::process::id();
  let mut system = System::new_all();
  system.refresh_processes(ProcessesToUpdate::All, true);

  Ok(
    system
      .processes()
      .iter()
      .filter_map(|(pid, process)| {
        let exe = process.exe()?;
        let exe = normalize_path(exe).ok()?;
        if !paths_match(&runner_path, &exe) {
          return None;
        }
        if pid.as_u32() == current_pid {
          return None;
        }
        Some(*pid)
      })
      .collect(),
  )
}

fn stop_runner_processes(runner_path: &Path) -> Result<()> {
  let runner_path = normalize_path(runner_path)?;
  let current_pid = std::process::id();
  let mut system = System::new_all();
  system.refresh_processes(ProcessesToUpdate::All, true);

  for (pid, process) in system.processes() {
    let Some(exe) = process.exe() else {
      continue;
    };
    let Ok(exe) = normalize_path(exe) else {
      continue;
    };
    if !paths_match(&runner_path, &exe) || pid.as_u32() == current_pid {
      continue;
    }

    if !process.kill_with(Signal::Term).unwrap_or(false) {
      let _ = process.kill();
    }
  }

  Ok(())
}

fn normalize_path(path: &Path) -> Result<PathBuf> {
  std::fs::canonicalize(path).or_else(|_| Ok(path.to_path_buf()))
}

fn paths_match(left: &Path, right: &Path) -> bool {
  if cfg!(target_os = "windows") {
    left
      .to_string_lossy()
      .eq_ignore_ascii_case(&right.to_string_lossy())
  } else {
    left == right
  }
}

#[cfg(target_os = "macos")]
fn launch_agent_path() -> Result<PathBuf> {
  let base_dirs = BaseDirs::new().context("failed to locate the user home directory")?;
  Ok(
    base_dirs
      .home_dir()
      .join("Library")
      .join("LaunchAgents")
      .join("com.keyspeed.typing-runner.plist"),
  )
}

#[cfg(target_os = "linux")]
fn linux_autostart_path() -> Result<PathBuf> {
  let base_dirs = BaseDirs::new().context("failed to locate the user home directory")?;
  Ok(
    base_dirs
      .home_dir()
      .join(".config")
      .join("autostart")
      .join("keyspeed-runner.desktop"),
  )
}

#[cfg(target_os = "macos")]
fn xml_escape(value: &str) -> String {
  value
    .replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
    .replace('"', "&quot;")
    .replace('\'', "&apos;")
}
