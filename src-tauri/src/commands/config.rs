use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuDetectionResult {
    pub has_nvenc: bool,
    pub has_amf: bool,
    pub has_qsv: bool,
    pub recommended: String,
    pub label: String,
}

/// Probe which hardware encoders are available by asking ffmpeg.
#[tauri::command]
pub async fn detect_gpu(app: AppHandle) -> Result<GpuDetectionResult, String> {
    // Ask ffmpeg to list its encoders
    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("Failed to find ffmpeg: {}", e))?
        .args(["-hide_banner", "-encoders"])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    let has_nvenc = stdout.contains("h264_nvenc");
    let has_amf = stdout.contains("h264_amf");
    let has_qsv = stdout.contains("h264_qsv");

    let (recommended, label) = if has_nvenc {
        ("nvenc".to_string(), "NVIDIA GPU".to_string())
    } else if has_amf {
        ("amf".to_string(), "AMD GPU".to_string())
    } else if has_qsv {
        ("qsv".to_string(), "Intel GPU".to_string())
    } else {
        ("software".to_string(), "CPU only".to_string())
    };

    Ok(GpuDetectionResult {
        has_nvenc,
        has_amf,
        has_qsv,
        recommended,
        label,
    })
}
