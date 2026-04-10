use tauri::{AppHandle, Manager};
use crate::config::{self, AppConfig};
use std::path::PathBuf;

#[tauri::command]
pub async fn get_config(app: AppHandle) -> Result<AppConfig, String> {
    Ok(config::read_config(&app))
}

#[tauri::command]
pub async fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    config::write_config(&app, &config)
}

#[tauri::command]
pub async fn open_download_folder(app: AppHandle) -> Result<(), String> {
    let cfg = config::read_config(&app);
    let folder = match cfg.download_path {
        Some(ref p) => PathBuf::from(p),
        None => app
            .path()
            .download_dir()
            .map_err(|e| format!("Failed to get downloads dir: {}", e))?,
    };

    if !folder.exists() {
        std::fs::create_dir_all(&folder).ok();
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .arg(folder.to_string_lossy().to_string())
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(folder.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}
