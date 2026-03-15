use std::{env, fs, path::PathBuf};

fn main() {
    ensure_sidecar_placeholder();
    tauri_build::build()
}

fn ensure_sidecar_placeholder() {
    let manifest_dir = match env::var("CARGO_MANIFEST_DIR") {
        Ok(value) => value,
        Err(_) => return,
    };
    let target_triple = env::var("TAURI_ENV_TARGET_TRIPLE")
        .or_else(|_| env::var("TARGET"))
        .unwrap_or_default();

    if target_triple.is_empty() {
        return;
    }

    let binary_name = if target_triple.contains("windows") {
        format!("typing-runner-{}.exe", target_triple)
    } else {
        format!("typing-runner-{}", target_triple)
    };
    let binary_path = PathBuf::from(manifest_dir)
        .join("binaries")
        .join(binary_name);

    if binary_path.exists() {
        return;
    }

    if let Some(parent) = binary_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let _ = fs::write(binary_path, b"placeholder");
}
