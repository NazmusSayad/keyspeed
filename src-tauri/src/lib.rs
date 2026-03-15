mod db;
pub mod models;
pub mod runner;
mod startup;

use models::{AppSettings, AppStatePayload, RunnerStatus};
use tauri::{AppHandle, Manager, State};

struct AppState {
    pool: sqlx::SqlitePool,
}

#[tauri::command]
async fn load_app_state(app: AppHandle, state: State<'_, AppState>) -> Result<AppStatePayload, String> {
    let autostart_configured = startup::is_runner_autostart_configured(&app).unwrap_or(false);
    let dashboard = db::load_dashboard(&state.pool)
        .await
        .map_err(|error| error.to_string())?;
    let settings = db::load_settings(&state.pool)
        .await
        .map_err(|error| error.to_string())?;
    let runner = db::load_runner_status(&state.pool, autostart_configured)
        .await
        .map_err(|error| error.to_string())?;

    Ok(AppStatePayload {
        dashboard,
        settings,
        runner,
        database_path: db::database_path()
            .map(|path| path.display().to_string())
            .map_err(|error| error.to_string())?,
        runner_path: startup::resolve_runner_path(&app).map(|path| path.display().to_string()),
        permission_hint: startup::permission_hint(),
    })
}

#[tauri::command]
async fn save_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let saved_settings = db::save_settings(&state.pool, &settings)
        .await
        .map_err(|error| error.to_string())?;

    startup::sync_runner_autostart(&app, saved_settings.autostart_runner)
        .map_err(|error| error.to_string())?;

    Ok(saved_settings)
}

#[tauri::command]
async fn start_runner(app: AppHandle, state: State<'_, AppState>) -> Result<RunnerStatus, String> {
    startup::start_runner(&app)
        .await
        .map_err(|error| error.to_string())?;

    tokio::time::sleep(std::time::Duration::from_millis(800)).await;

    let autostart_configured = startup::is_runner_autostart_configured(&app).unwrap_or(false);
    db::load_runner_status(&state.pool, autostart_configured)
        .await
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pool = tauri::async_runtime::block_on(db::connect_pool())
        .expect("failed to initialize the shared sqlite database");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { pool })
        .setup(|app| {
            let handle = app.handle().clone();
            let pool = app.state::<AppState>().pool.clone();

            tauri::async_runtime::spawn(async move {
                if let Ok(settings) = db::load_settings(&pool).await {
                    let _ = startup::sync_runner_autostart(&handle, settings.autostart_runner);
                    let autostart_configured =
                        startup::is_runner_autostart_configured(&handle).unwrap_or(false);

                    if let Ok(status) = db::load_runner_status(&pool, autostart_configured).await {
                        if !status.is_running {
                            let _ = startup::start_runner(&handle).await;
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![load_app_state, save_settings, start_runner])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
