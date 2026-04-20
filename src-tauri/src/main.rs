// Prevents additional console window on Windows
#![windows_subsystem = "windows"]

mod commands;
mod compress_args;
mod compressor;
mod config;
mod converter;
mod ffmpeg_args;
mod ffprobe;
mod history;
mod jobs;

use compressor::CompressJobStore;
use converter::ConvertJobStore;
use jobs::JobStore;
use tauri::Manager;

/// Purge all files from the temp download staging directory on startup.
/// Any files here are orphans from previous sessions (crashes, force-closes).
/// Active downloads only exist within a single app session.
fn cleanup_staging_dir(app: &tauri::AppHandle) {
    let Ok(staging) = app.path().app_data_dir().map(|d| d.join("downloads")) else {
        return;
    };
    let Ok(entries) = std::fs::read_dir(&staging) else {
        return;
    };
    for entry in entries.flatten() {
        let _ = std::fs::remove_file(entry.path());
    }
}

/// Clear WebView2 HTTP/code/GPU caches that accumulate over time.
/// These are safe to remove — the browser engine recreates them on demand.
/// We keep Local Storage and session data intact.
fn cleanup_webview_cache(app: &tauri::AppHandle) {
    let Ok(local_data) = app.path().app_local_data_dir() else {
        return;
    };
    // WebView2 on Windows stores data under EBWebView/Default/
    let webview_default = local_data.join("EBWebView").join("Default");
    let cache_dirs = ["Cache", "Code Cache", "GPUCache"];
    for dir_name in &cache_dirs {
        let dir = webview_default.join(dir_name);
        if dir.is_dir() {
            let _ = std::fs::remove_dir_all(&dir);
        }
    }
}

fn main() {
    tauri::Builder::default()
        /* 
        // Single instance disabled to ensure launch
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
            }
        }))
        */
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                cleanup_staging_dir(&handle);
                cleanup_webview_cache(&handle);
            });

            // Center then show — window starts hidden to avoid position glitch
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.center();
                let _ = window.show();
            }

            Ok(())
        })
        .manage(JobStore::default())
        .manage(ConvertJobStore::default())
        .manage(CompressJobStore::default())
        .invoke_handler(tauri::generate_handler![
            commands::download::get_playlist_info,
            commands::download::get_info,
            commands::download::start_download,
            commands::download::get_status,
            commands::download::cleanup_download,
            commands::config::get_config,
            commands::config::save_config,
            commands::config::open_download_folder,
            commands::config::show_in_folder,
            commands::config::detect_gpu,
            commands::history::get_history,
            commands::history::clear_history,
            commands::convert::probe_file,
            commands::convert::start_conversion,
            commands::convert::cancel_conversion,
            commands::compress::start_compression,
            commands::compress::cancel_compression,
        ])
        .run(tauri::generate_context!())
        .expect("error while running DeClyp");
}
