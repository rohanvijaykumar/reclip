use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const MAX_HISTORY: usize = 500;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: String,
    pub url: String,
    pub title: String,
    pub uploader: String,
    pub thumbnail: String,
    pub filename: String,
    pub saved_path: String,
    pub format: String,
    pub output_format: String,
    pub quality: String,
    pub timestamp: i64,
}

fn history_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    std::fs::create_dir_all(&dir).ok();
    Ok(dir.join("history.json"))
}

pub fn read_history(app: &AppHandle) -> Vec<HistoryEntry> {
    history_path(app)
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn append_history(app: &AppHandle, entry: HistoryEntry) {
    let mut history = read_history(app);
    history.insert(0, entry); // newest first
    if history.len() > MAX_HISTORY {
        history.truncate(MAX_HISTORY);
    }
    if let Ok(path) = history_path(app) {
        if let Ok(json) = serde_json::to_string_pretty(&history) {
            let _ = std::fs::write(path, json);
        }
    }
}

pub fn clear_all(app: &AppHandle) {
    if let Ok(path) = history_path(app) {
        let _ = std::fs::write(path, "[]");
    }
}
