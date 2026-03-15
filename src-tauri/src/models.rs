use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
  pub idle_timeout_seconds: u64,
  pub autostart_runner: bool,
  pub retain_raw_days: i64,
  pub capture_active_app: bool,
}

impl Default for AppSettings {
  fn default() -> Self {
    Self {
      idle_timeout_seconds: 5,
      autostart_runner: true,
      retain_raw_days: 30,
      capture_active_app: false,
    }
  }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStatePayload {
  pub dashboard: DashboardPayload,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatePayload {
  pub runner: RunnerStatus,
  pub database_path: String,
  pub runner_path: Option<String>,
  pub permission_hint: PermissionHint,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardPayload {
  pub overview: OverviewMetrics,
  pub timeline: Vec<TimelinePoint>,
  pub daily_summaries: Vec<DailySummary>,
  pub recent_sessions: Vec<SessionSummary>,
  pub productivity: ProductivityMetrics,
  pub last_updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverviewMetrics {
  pub total_key_presses: i64,
  pub today_keys: i64,
  pub today_keys_per_minute: f64,
  pub estimated_wpm: f64,
  pub week_keys: i64,
  pub average_interval_ms: Option<f64>,
  pub average_hold_duration_ms: Option<f64>,
  pub active_seconds: f64,
  pub idle_seconds: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelinePoint {
  pub timestamp: String,
  pub key_count: i64,
  pub active_seconds: f64,
  pub average_interval_ms: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailySummary {
  pub date: String,
  pub key_count: i64,
  pub active_seconds: f64,
  pub estimated_wpm: f64,
  pub session_count: i64,
  pub burst_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
  pub id: String,
  pub started_at: String,
  pub ended_at: String,
  pub duration_minutes: f64,
  pub key_count: i64,
  pub average_interval_ms: Option<f64>,
  pub average_hold_duration_ms: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductivityMetrics {
  pub focus_score: f64,
  pub consistency_score: f64,
  pub burst_count: i64,
  pub average_session_minutes: f64,
  pub longest_session_minutes: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerStatus {
  pub is_running: bool,
  pub autostart_configured: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionHint {
  pub required: bool,
  pub title: String,
  pub body: String,
  pub action_label: Option<String>,
  pub action_url: Option<String>,
}
