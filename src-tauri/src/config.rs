use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub download_path: Option<String>,
    pub default_video_quality: String,
    pub notifications_enabled: bool,
    pub theme: String,
    #[serde(default = "default_true")]
    pub clipboard_watch_enabled: bool,
    #[serde(default = "default_true")]
    pub hw_accel_enabled: bool,
    #[serde(default)]
    pub detected_gpu: Option<String>,
}

fn default_true() -> bool {
    true
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            download_path: None,
            default_video_quality: "best".to_string(),
            notifications_enabled: false,
            theme: "dark".to_string(),
            clipboard_watch_enabled: true,
            hw_accel_enabled: true,
            detected_gpu: None,
        }
    }
}

pub fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    std::fs::create_dir_all(&dir).ok();
    Ok(dir.join("config.json"))
}

pub fn read_config(app: &AppHandle) -> AppConfig {
    config_path(app)
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn write_config(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let path = config_path(app)?;
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    std::fs::write(&path, json)
        .map_err(|e| format!("Failed to write config: {}", e))?;
    Ok(())
}
