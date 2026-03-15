mod db;
pub mod models;
pub mod runner;
mod settings;
mod startup;
mod storage;

use models::{AppSettings, AppStatePayload, RunnerStatus};
use tauri::{AppHandle, Manager, State};

struct AppState {
  pool: sqlx::SqlitePool,
}

#[tauri::command]
async fn load_app_state(
  app: AppHandle,
  state: State<'_, AppState>,
) -> Result<AppStatePayload, String> {
  let settings = settings::load().map_err(|error| error.to_string())?;
  let dashboard = db::load_dashboard(&state.pool, &settings)
    .await
    .map_err(|error| error.to_string())?;
  let runner = startup::load_runner_status(&app)
    .await
    .map_err(|error| error.to_string())?;

  Ok(AppStatePayload {
    dashboard,
    settings,
    runner,
    database_path: storage::database_path()
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
  let saved_settings = settings::save(&settings).map_err(|error| error.to_string())?;

  db::prune_old_events(&state.pool, saved_settings.retain_raw_days)
    .await
    .map_err(|error| error.to_string())?;

  startup::sync_runner_autostart(&app, saved_settings.autostart_runner)
    .map_err(|error| error.to_string())?;

  Ok(saved_settings)
}

#[tauri::command]
async fn start_runner(app: AppHandle) -> Result<RunnerStatus, String> {
  let status = startup::load_runner_status(&app)
    .await
    .map_err(|error| error.to_string())?;

  if !status.is_running {
    startup::start_runner(&app)
      .await
      .map_err(|error| error.to_string())?;
  }

  startup::wait_for_runner(&app)
    .await
    .map_err(|error| error.to_string())?;

  startup::load_runner_status(&app)
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
        if let Ok(settings) = settings::load() {
          let _ = db::prune_old_events(&pool, settings.retain_raw_days).await;
          let _ = startup::sync_runner_autostart(&handle, settings.autostart_runner);

          if let Ok(status) = startup::load_runner_status(&handle).await {
            if !status.is_running {
              let _ = startup::start_runner(&handle).await;
              let _ = startup::wait_for_runner(&handle).await;
            }
          }
        }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      load_app_state,
      save_settings,
      start_runner
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
