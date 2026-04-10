// Prevents additional console window on Windows
#![windows_subsystem = "windows"]

mod commands;
mod config;
mod history;
mod jobs;

use jobs::JobStore;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        // Single instance MUST be first plugin registered
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage(JobStore::default())
        .invoke_handler(tauri::generate_handler![
            commands::download::get_info,
            commands::download::start_download,
            commands::download::get_status,
            commands::download::save_file,
            commands::config::get_config,
            commands::config::save_config,
            commands::config::open_download_folder,
            commands::history::get_history,
            commands::history::clear_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ReClip");
}
