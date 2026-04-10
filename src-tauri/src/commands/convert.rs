use crate::converter::ConvertJobStore;
use crate::ffmpeg_args::{self, ConversionSettings};
use crate::ffprobe::{self, MediaInfo};
use crate::history::{self, HistoryEntry};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConvertProgressPayload {
    pub job_id: String,
    pub progress: f64,
    pub speed: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConvertCompletePayload {
    pub job_id: String,
    pub output_path: String,
    pub output_filename: String,
    pub output_size: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConvertErrorPayload {
    pub job_id: String,
    pub error: String,
}

/// Probe a local file to get its media information.
#[tauri::command]
pub async fn probe_file(app: AppHandle, path: String) -> Result<MediaInfo, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("File not found".into());
    }

    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("Failed to find ffmpeg: {}", e))?
        .args(["-i", &path, "-hide_banner"])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    // ffmpeg -i outputs info to stderr (and exits with error since no output specified)
    let stderr = String::from_utf8_lossy(&output.stderr);
    let info = ffprobe::parse_ffmpeg_info(&stderr, &path);

    if !info.has_video && !info.has_audio {
        return Err("Not a valid media file".into());
    }

    Ok(info)
}

/// Start a conversion job. Returns the job ID.
#[tauri::command]
pub async fn start_conversion(
    app: AppHandle,
    state: tauri::State<'_, ConvertJobStore>,
    input_path: String,
    settings: ConversionSettings,
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
    let base_filename = output_filename.unwrap_or_else(|| format!("{}_converted.{}", input_name, out_ext));
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

    // Build ffmpeg args
    let args = ffmpeg_args::build_ffmpeg_args(&input_path, &output_path_str, &settings);

    // Create job
    let job = crate::converter::ConvertJob {
        id: job_id.clone(),
        input_path: input_path.clone(),
        input_filename: Path::new(&input_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default(),
        output_path: output_path_str.clone(),
        status: crate::converter::ConvertJobStatus::Converting {
            progress: 0.0,
            speed: None,
        },
        duration_secs,
    };
    state.insert(job).await;

    // Spawn ffmpeg
    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("Failed to find ffmpeg: {}", e))?
        .args(&args)
        .spawn()
        .map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;

    // Store PID for cancellation
    state.store_pid(&job_id, child.pid()).await;

    // Data for history + notifications
    let notifications_enabled = cfg.notifications_enabled;
    let out_format = settings.output_format.clone();
    let quality_label = settings.video_codec.clone().unwrap_or_default();

    let app_handle = app.clone();
    let store = state.inner().clone();
    let jid = job_id.clone();
    let out_path = output_path_str.clone();
    let out_fname = output_filename_str.clone();
    let in_path = input_path.clone();
    let total_duration = duration_secs;

    tokio::spawn(async move {
        let mut stderr_lines: Vec<String> = Vec::new();

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let line_str = String::from_utf8_lossy(&line);
                    // Parse -progress pipe:1 output
                    // Lines like: out_time_us=5000000  speed=2.00x  progress=continue
                    for kv_line in line_str.lines() {
                        let kv_line = kv_line.trim();
                        if let Some(time_us_str) = kv_line.strip_prefix("out_time_us=") {
                            if let Ok(us) = time_us_str.trim().parse::<i64>() {
                                if total_duration > 0.0 && us > 0 {
                                    let progress = (us as f64 / 1_000_000.0 / total_duration * 100.0).min(100.0);
                                    store.update_progress(&jid, progress, None).await;
                                    let _ = app_handle.emit(
                                        "convert-progress",
                                        ConvertProgressPayload {
                                            job_id: jid.clone(),
                                            progress,
                                            speed: None,
                                        },
                                    );
                                }
                            }
                        }
                        if let Some(speed_str) = kv_line.strip_prefix("speed=") {
                            let speed = speed_str.trim().to_string();
                            if !speed.is_empty() && speed != "N/A" {
                                store.update_progress(&jid, -1.0, Some(speed.clone())).await;
                                let _ = app_handle.emit(
                                    "convert-progress",
                                    ConvertProgressPayload {
                                        job_id: jid.clone(),
                                        progress: -1.0, // -1 means "update speed only"
                                        speed: Some(speed),
                                    },
                                );
                            }
                        }
                    }
                }
                CommandEvent::Stderr(line) => {
                    let line_str = String::from_utf8_lossy(&line).to_string();
                    stderr_lines.push(line_str);
                }
                CommandEvent::Terminated(status) => {
                    store.remove_pid(&jid).await;
                    let success = status.code.map_or(false, |c| c == 0);

                    if !success {
                        // Check if cancelled
                        let job = store.get(&jid).await;
                        if let Some(j) = &job {
                            if matches!(j.status, crate::converter::ConvertJobStatus::Cancelled) {
                                return; // Already marked cancelled
                            }
                        }

                        let err_msg = stderr_lines
                            .iter()
                            .rev()
                            .find(|l| !l.trim().is_empty())
                            .cloned()
                            .unwrap_or_else(|| "Conversion failed".to_string());
                        store.mark_error(&jid, err_msg.clone()).await;
                        let _ = app_handle.emit(
                            "convert-error",
                            ConvertErrorPayload {
                                job_id: jid.clone(),
                                error: err_msg,
                            },
                        );
                        return;
                    }

                    // Get output file size
                    let output_size = std::fs::metadata(&out_path)
                        .map(|m| m.len())
                        .unwrap_or(0);

                    // Append to history
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
                        format: "convert".to_string(),
                        output_format: out_format.clone(),
                        quality: quality_label.clone(),
                        timestamp: chrono::Utc::now().timestamp(),
                    };
                    history::append_history(&app_handle, entry);

                    // Native notification
                    if notifications_enabled {
                        let _ = app_handle
                            .notification()
                            .builder()
                            .title("Conversion Complete")
                            .body(&format!("{} is ready", out_fname))
                            .show();
                    }

                    store.mark_done(&jid, out_path.clone(), out_fname.clone(), output_size).await;
                    let _ = app_handle.emit(
                        "convert-complete",
                        ConvertCompletePayload {
                            job_id: jid.clone(),
                            output_path: out_path.clone(),
                            output_filename: out_fname.clone(),
                            output_size,
                        },
                    );
                }
                _ => {}
            }
        }
    });

    Ok(job_id)
}

/// Cancel an active conversion by killing the ffmpeg process.
#[tauri::command]
pub async fn cancel_conversion(
    state: tauri::State<'_, ConvertJobStore>,
    job_id: String,
) -> Result<(), String> {
    state.mark_cancelled(&job_id).await;

    if let Some(pid) = state.get_pid(&job_id).await {
        // Kill the process on Windows
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
