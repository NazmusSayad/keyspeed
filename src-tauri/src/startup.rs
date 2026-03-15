use std::{env, path::PathBuf, process::Stdio};

use anyhow::{Context, Result};
use tauri::{AppHandle, Manager};

use crate::models::PermissionHint;

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
        body: "Keyspeed tracks timing metadata only and never stores actual key values or typed content.".to_string(),
        action_label: None,
        action_url: None,
    }
}

pub async fn start_runner(app: &AppHandle) -> Result<()> {
    let runner_path = resolve_runner_path(app).context("failed to resolve typing-runner")?;
    let mut command = std::process::Command::new(&runner_path);

    command.stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());

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

pub fn resolve_runner_path(app: &AppHandle) -> Option<PathBuf> {
    let binary_name = if cfg!(target_os = "windows") {
        "typing-runner.exe"
    } else {
        "typing-runner"
    };
    let mut candidates = Vec::new();

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
    let runner_path = resolve_runner_path(app).context("failed to resolve runner for autostart status")?;

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
        return Ok(path.exists()
            && fs::read_to_string(path)?.contains(&runner_path.display().to_string()));
    }

    #[cfg(target_os = "linux")]
    {
        let path = linux_autostart_path()?;
        return Ok(path.exists()
            && fs::read_to_string(path)?.contains(&runner_path.display().to_string()));
    }

    #[allow(unreachable_code)]
    Ok(false)
}

#[cfg(target_os = "macos")]
fn launch_agent_path() -> Result<PathBuf> {
    let base_dirs = BaseDirs::new().context("failed to locate the user home directory")?;
    Ok(base_dirs
        .home_dir()
        .join("Library")
        .join("LaunchAgents")
        .join("com.keyspeed.typing-runner.plist"))
}

#[cfg(target_os = "linux")]
fn linux_autostart_path() -> Result<PathBuf> {
    let base_dirs = BaseDirs::new().context("failed to locate the user home directory")?;
    Ok(base_dirs
        .home_dir()
        .join(".config")
        .join("autostart")
        .join("keyspeed-runner.desktop"))
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
