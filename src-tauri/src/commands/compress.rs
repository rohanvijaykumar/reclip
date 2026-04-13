use crate::compress_args::{self, CompressionSettings};
use crate::compressor::CompressJobStore;
use crate::history::{self, HistoryEntry};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

/// Extract a useful error message from ffmpeg stderr lines.
/// Skips the generic "Conversion failed!" line and finds the actual specific error.
fn extract_ffmpeg_error(stderr_lines: &[String]) -> String {
    // Log full stderr for debugging
    eprintln!("[compress] ffmpeg stderr ({} lines):", stderr_lines.len());
    for line in stderr_lines.iter() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            eprintln!("  {}", trimmed);
        }
    }

    // Search FORWARD for specific error lines, skipping generic ffmpeg status messages
    let generic_endings = ["conversion failed!", "press [q] to stop"];
    for line in stderr_lines.iter() {
        let trimmed = line.trim();
        let lower = trimmed.to_lowercase();
        // Skip generic/useless lines
        if generic_endings.iter().any(|g| lower == *g) {
            continue;
        }
        if lower.contains("error") || lower.contains("invalid") || lower.contains("no such")
            || lower.contains("not found") || lower.contains("unknown encoder")
            || lower.contains("unknown decoder") || lower.contains("mismatch")
            || lower.contains("cannot") || lower.contains("does not exist")
            || lower.contains("unrecognized option") || lower.contains("not available")
        {
            return trimmed.to_string();
        }
    }
    // Fallback: collect last few meaningful lines
    let meaningful: Vec<&str> = stderr_lines
        .iter()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();
    let tail: Vec<&str> = meaningful.iter().rev().take(3).copied().collect();
    if tail.is_empty() {
        "Compression failed (no ffmpeg output)".to_string()
    } else {
        tail.into_iter().rev().collect::<Vec<_>>().join(" | ")
    }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CompressProgressPayload {
    pub job_id: String,
    pub progress: f64,
    pub speed: Option<String>,
    pub pass: Option<u32>,
    pub total_passes: Option<u32>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CompressCompletePayload {
    pub job_id: String,
    pub output_path: String,
    pub output_filename: String,
    pub output_size: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CompressErrorPayload {
    pub job_id: String,
    pub error: String,
}

#[tauri::command]
pub async fn start_compression(
    app: AppHandle,
    state: tauri::State<'_, CompressJobStore>,
    input_path: String,
    settings: CompressionSettings,
    output_dir: Option<String>,
    output_filename: Option<String>,
    duration_secs: f64,
) -> Result<String, String> {
    let job_id = uuid::Uuid::new_v4().to_string()[..10].to_string();

    // Determine output directory
    let cfg = crate::config::read_config(&app);
    let save_dir = match output_dir {
        Some(ref d) if !d.is_empty() => PathBuf::from(d),
        _ => match cfg.download_path {
            Some(ref p) => PathBuf::from(p),
            None => app
                .path()
                .download_dir()
                .map_err(|e| format!("Failed to get downloads dir: {}", e))?,
        },
    };
    std::fs::create_dir_all(&save_dir).ok();

    // Generate output filename
    let input_name = Path::new(&input_path)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "output".to_string());

    let out_ext = &settings.output_format;
    let base_filename = output_filename
        .unwrap_or_else(|| format!("{}_compressed.{}", input_name, out_ext));
    let dest = save_dir.join(&base_filename);

    // Handle name conflicts
    let final_dest = if dest.exists() {
        let stem = dest.file_stem().unwrap_or_default().to_string_lossy().to_string();
        let ext = dest.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
        let mut counter = 1;
        loop {
            let candidate = save_dir.join(format!("{} ({}){}", stem, counter, ext));
            if !candidate.exists() { break candidate; }
            counter += 1;
        }
    } else {
        dest
    };

    let output_path_str = final_dest.to_string_lossy().to_string();
    let output_filename_str = final_dest
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| base_filename.clone());

    // Determine if two-pass
    let is_two_pass = settings.target_size_mb.is_some();

    // Create job
    let job = crate::compressor::CompressJob {
        id: job_id.clone(),
        input_path: input_path.clone(),
        input_filename: Path::new(&input_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default(),
        output_path: output_path_str.clone(),
        status: crate::compressor::CompressJobStatus::Compressing {
            progress: 0.0,
            speed: None,
            pass: if is_two_pass { Some(1) } else { None },
            total_passes: if is_two_pass { Some(2) } else { None },
        },
        duration_secs,
    };
    state.insert(job).await;

    let detected_gpu = cfg.detected_gpu.as_deref();
    let notifications_enabled = cfg.notifications_enabled;
    let out_format = settings.output_format.clone();
    let app_handle = app.clone();
    let store = state.inner().clone();
    let jid = job_id.clone();
    let out_path = output_path_str.clone();
    let out_fname = output_filename_str.clone();
    let in_path = input_path.clone();
    let total_duration = duration_secs;

    if is_two_pass {
        // Two-pass target-size compression
        let passlog_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?;
        std::fs::create_dir_all(&passlog_dir).ok();
        let passlog_prefix = passlog_dir.join(format!("passlog_{}", &jid)).to_string_lossy().to_string();

        let (pass1_args, pass2_args) = compress_args::build_two_pass_args(
            &input_path,
            &output_path_str,
            &settings,
            duration_secs,
            &passlog_prefix,
        );

        // Debug: log the ffmpeg args
        eprintln!("[compress] pass 1 args: {:?}", pass1_args);
        eprintln!("[compress] pass 2 args: {:?}", pass2_args);

        // Spawn pass 1
        let (mut rx1, child1) = app
            .shell()
            .sidecar("ffmpeg")
            .map_err(|e| format!("Failed to find ffmpeg: {}", e))?
            .args(&pass1_args)
            .spawn()
            .map_err(|e| format!("Failed to spawn ffmpeg pass 1: {}", e))?;

        state.store_pid(&jid, child1.pid()).await;

        let passlog_prefix_clone = passlog_prefix.clone();
        let settings_clone = settings.clone();

        tokio::spawn(async move {
            let mut stderr_lines: Vec<String> = Vec::new();

            // === PASS 1 ===
            while let Some(event) = rx1.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        let line_str = String::from_utf8_lossy(&line);
                        for kv_line in line_str.lines() {
                            let kv_line = kv_line.trim();
                            if let Some(time_us_str) = kv_line.strip_prefix("out_time_us=") {
                                if let Ok(us) = time_us_str.trim().parse::<i64>() {
                                    if total_duration > 0.0 && us > 0 {
                                        let raw = (us as f64 / 1_000_000.0 / total_duration * 100.0).min(100.0);
                                        let progress = raw * 0.5; // Pass 1 = 0-50%
                                        store.update_progress(&jid, progress, None, Some(1), Some(2)).await;
                                        let _ = app_handle.emit("compress-progress", CompressProgressPayload {
                                            job_id: jid.clone(),
                                            progress,
                                            speed: None,
                                            pass: Some(1),
                                            total_passes: Some(2),
                                        });
                                    }
                                }
                            }
                            if let Some(speed_str) = kv_line.strip_prefix("speed=") {
                                let speed = speed_str.trim().to_string();
                                if !speed.is_empty() && speed != "N/A" {
                                    store.update_progress(&jid, -1.0, Some(speed.clone()), None, None).await;
                                    let _ = app_handle.emit("compress-progress", CompressProgressPayload {
                                        job_id: jid.clone(),
                                        progress: -1.0,
                                        speed: Some(speed),
                                        pass: Some(1),
                                        total_passes: Some(2),
                                    });
                                }
                            }
                        }
                    }
                    CommandEvent::Stderr(line) => {
                        stderr_lines.push(String::from_utf8_lossy(&line).to_string());
                    }
                    CommandEvent::Terminated(status) => {
                        store.remove_pid(&jid).await;
                        let success = status.code.map_or(false, |c| c == 0);

                        if !success {
                            // Check if cancelled
                            if let Some(j) = store.get(&jid).await {
                                if matches!(j.status, crate::compressor::CompressJobStatus::Cancelled) {
                                    compress_args::cleanup_passlog(&passlog_prefix_clone);
                                    return;
                                }
                            }
                            let err_msg = extract_ffmpeg_error(&stderr_lines);
                            store.mark_error(&jid, err_msg.clone()).await;
                            let _ = app_handle.emit("compress-error", CompressErrorPayload {
                                job_id: jid.clone(),
                                error: err_msg,
                            });
                            compress_args::cleanup_passlog(&passlog_prefix_clone);
                            return;
                        }

                        // Check if cancelled between passes
                        if let Some(j) = store.get(&jid).await {
                            if matches!(j.status, crate::compressor::CompressJobStatus::Cancelled) {
                                compress_args::cleanup_passlog(&passlog_prefix_clone);
                                return;
                            }
                        }

                        // === PASS 2 ===
                        store.update_progress(&jid, 50.0, None, Some(2), Some(2)).await;
                        let _ = app_handle.emit("compress-progress", CompressProgressPayload {
                            job_id: jid.clone(),
                            progress: 50.0,
                            speed: None,
                            pass: Some(2),
                            total_passes: Some(2),
                        });

                        let spawn_result = app_handle
                            .shell()
                            .sidecar("ffmpeg")
                            .and_then(|cmd| Ok(cmd.args(&pass2_args).spawn()));

                        let (mut rx2, child2) = match spawn_result {
                            Ok(Ok((rx, child))) => (rx, child),
                            _ => {
                                let err = "Failed to spawn ffmpeg pass 2".to_string();
                                store.mark_error(&jid, err.clone()).await;
                                let _ = app_handle.emit("compress-error", CompressErrorPayload {
                                    job_id: jid.clone(),
                                    error: err,
                                });
                                compress_args::cleanup_passlog(&passlog_prefix_clone);
                                return;
                            }
                        };

                        store.store_pid(&jid, child2.pid()).await;
                        let mut stderr2: Vec<String> = Vec::new();

                        while let Some(ev2) = rx2.recv().await {
                            match ev2 {
                                CommandEvent::Stdout(line) => {
                                    let line_str = String::from_utf8_lossy(&line);
                                    for kv_line in line_str.lines() {
                                        let kv_line = kv_line.trim();
                                        if let Some(time_us_str) = kv_line.strip_prefix("out_time_us=") {
                                            if let Ok(us) = time_us_str.trim().parse::<i64>() {
                                                if total_duration > 0.0 && us > 0 {
                                                    let raw = (us as f64 / 1_000_000.0 / total_duration * 100.0).min(100.0);
                                                    let progress = 50.0 + raw * 0.5; // Pass 2 = 50-100%
                                                    store.update_progress(&jid, progress, None, Some(2), Some(2)).await;
                                                    let _ = app_handle.emit("compress-progress", CompressProgressPayload {
                                                        job_id: jid.clone(),
                                                        progress,
                                                        speed: None,
                                                        pass: Some(2),
                                                        total_passes: Some(2),
                                                    });
                                                }
                                            }
                                        }
                                        if let Some(speed_str) = kv_line.strip_prefix("speed=") {
                                            let speed = speed_str.trim().to_string();
                                            if !speed.is_empty() && speed != "N/A" {
                                                store.update_progress(&jid, -1.0, Some(speed.clone()), None, None).await;
                                                let _ = app_handle.emit("compress-progress", CompressProgressPayload {
                                                    job_id: jid.clone(),
                                                    progress: -1.0,
                                                    speed: Some(speed),
                                                    pass: Some(2),
                                                    total_passes: Some(2),
                                                });
                                            }
                                        }
                                    }
                                }
                                CommandEvent::Stderr(line) => {
                                    stderr2.push(String::from_utf8_lossy(&line).to_string());
                                }
                                CommandEvent::Terminated(status2) => {
                                    store.remove_pid(&jid).await;
                                    compress_args::cleanup_passlog(&passlog_prefix_clone);

                                    let success2 = status2.code.map_or(false, |c| c == 0);
                                    if !success2 {
                                        if let Some(j) = store.get(&jid).await {
                                            if matches!(j.status, crate::compressor::CompressJobStatus::Cancelled) {
                                                return;
                                            }
                                        }
                                        let err_msg = extract_ffmpeg_error(&stderr2);
                                        store.mark_error(&jid, err_msg.clone()).await;
                                        let _ = app_handle.emit("compress-error", CompressErrorPayload {
                                            job_id: jid.clone(),
                                            error: err_msg,
                                        });
                                        return;
                                    }

                                    // Success
                                    let output_size = std::fs::metadata(&out_path)
                                        .map(|m| m.len())
                                        .unwrap_or(0);

                                    let entry = HistoryEntry {
                                        id: uuid::Uuid::new_v4().to_string(),
                                        url: in_path.clone(),
                                        title: Path::new(&in_path)
                                            .file_stem()
                                            .map(|s| s.to_string_lossy().to_string())
                                            .unwrap_or_default(),
                                        uploader: String::new(),
                                        thumbnail: String::new(),
                                        filename: out_fname.clone(),
                                        saved_path: out_path.clone(),
                                        format: "compress".to_string(),
                                        output_format: out_format.clone(),
                                        quality: format!("target {}MB", settings_clone.target_size_mb.unwrap_or(0.0) as u32),
                                        timestamp: chrono::Utc::now().timestamp(),
                                    };
                                    history::append_history(&app_handle, entry);

                                    if notifications_enabled {
                                        let _ = app_handle
                                            .notification()
                                            .builder()
                                            .title("Compression Complete")
                                            .body(&format!("{} is ready", out_fname))
                                            .show();
                                    }

                                    store.mark_done(&jid, out_path.clone(), out_fname.clone(), output_size).await;
                                    let _ = app_handle.emit("compress-complete", CompressCompletePayload {
                                        job_id: jid.clone(),
                                        output_path: out_path.clone(),
                                        output_filename: out_fname.clone(),
                                        output_size,
                                    });
                                }
                                _ => {}
                            }
                        }
                    }
                    _ => {}
                }
            }
        });
    } else {
        // Single-pass CRF compression
        let args = compress_args::build_compress_args(&input_path, &output_path_str, &settings, detected_gpu);

        // Debug: log the ffmpeg args
        eprintln!("[compress] single-pass args: {:?}", args);

        let (mut rx, child) = app
            .shell()
            .sidecar("ffmpeg")
            .map_err(|e| format!("Failed to find ffmpeg: {}", e))?
            .args(&args)
            .spawn()
            .map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;

        state.store_pid(&jid, child.pid()).await;

        tokio::spawn(async move {
            let mut stderr_lines: Vec<String> = Vec::new();

            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        let line_str = String::from_utf8_lossy(&line);
                        for kv_line in line_str.lines() {
                            let kv_line = kv_line.trim();
                            if let Some(time_us_str) = kv_line.strip_prefix("out_time_us=") {
                                if let Ok(us) = time_us_str.trim().parse::<i64>() {
                                    if total_duration > 0.0 && us > 0 {
                                        let progress = (us as f64 / 1_000_000.0 / total_duration * 100.0).min(100.0);
                                        store.update_progress(&jid, progress, None, None, None).await;
                                        let _ = app_handle.emit("compress-progress", CompressProgressPayload {
                                            job_id: jid.clone(),
                                            progress,
                                            speed: None,
                                            pass: None,
                                            total_passes: None,
                                        });
                                    }
                                }
                            }
                            if let Some(speed_str) = kv_line.strip_prefix("speed=") {
                                let speed = speed_str.trim().to_string();
                                if !speed.is_empty() && speed != "N/A" {
                                    store.update_progress(&jid, -1.0, Some(speed.clone()), None, None).await;
                                    let _ = app_handle.emit("compress-progress", CompressProgressPayload {
                                        job_id: jid.clone(),
                                        progress: -1.0,
                                        speed: Some(speed),
                                        pass: None,
                                        total_passes: None,
                                    });
                                }
                            }
                        }
                    }
                    CommandEvent::Stderr(line) => {
                        stderr_lines.push(String::from_utf8_lossy(&line).to_string());
                    }
                    CommandEvent::Terminated(status) => {
                        store.remove_pid(&jid).await;
                        let success = status.code.map_or(false, |c| c == 0);

                        if !success {
                            if let Some(j) = store.get(&jid).await {
                                if matches!(j.status, crate::compressor::CompressJobStatus::Cancelled) {
                                    return;
                                }
                            }
                            let err_msg = extract_ffmpeg_error(&stderr_lines);
                            store.mark_error(&jid, err_msg.clone()).await;
                            let _ = app_handle.emit("compress-error", CompressErrorPayload {
                                job_id: jid.clone(),
                                error: err_msg,
                            });
                            return;
                        }

                        let output_size = std::fs::metadata(&out_path)
                            .map(|m| m.len())
                            .unwrap_or(0);

                        let entry = HistoryEntry {
                            id: uuid::Uuid::new_v4().to_string(),
                            url: in_path.clone(),
                            title: Path::new(&in_path)
                                .file_stem()
                                .map(|s| s.to_string_lossy().to_string())
                                .unwrap_or_default(),
                            uploader: String::new(),
                            thumbnail: String::new(),
                            filename: out_fname.clone(),
                            saved_path: out_path.clone(),
                            format: "compress".to_string(),
                            output_format: out_format.clone(),
                            quality: format!("crf {}", settings.quality),
                            timestamp: chrono::Utc::now().timestamp(),
                        };
                        history::append_history(&app_handle, entry);

                        if notifications_enabled {
                            let _ = app_handle
                                .notification()
                                .builder()
                                .title("Compression Complete")
                                .body(&format!("{} is ready", out_fname))
                                .show();
                        }

                        store.mark_done(&jid, out_path.clone(), out_fname.clone(), output_size).await;
                        let _ = app_handle.emit("compress-complete", CompressCompletePayload {
                            job_id: jid.clone(),
                            output_path: out_path.clone(),
                            output_filename: out_fname.clone(),
                            output_size,
                        });
                    }
                    _ => {}
                }
            }
        });
    }

    Ok(job_id)
}

#[tauri::command]
pub async fn cancel_compression(
    state: tauri::State<'_, CompressJobStore>,
    job_id: String,
) -> Result<(), String> {
    state.mark_cancelled(&job_id).await;

    if let Some(pid) = state.get_pid(&job_id).await {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            let _ = std::process::Command::new("taskkill")
                .args(["/F", "/PID", &pid.to_string()])
                .creation_flags(0x08000000)
                .output();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = std::process::Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output();
        }
        state.remove_pid(&job_id).await;
    }

    Ok(())
}
