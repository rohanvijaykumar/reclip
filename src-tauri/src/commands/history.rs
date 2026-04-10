use tauri::AppHandle;
use crate::history::{self, HistoryEntry};

#[tauri::command]
pub async fn get_history(app: AppHandle) -> Result<Vec<HistoryEntry>, String> {
    Ok(history::read_history(&app))
}

#[tauri::command]
pub async fn clear_history(app: AppHandle) -> Result<(), String> {
    history::clear_all(&app);
    Ok(())
}
