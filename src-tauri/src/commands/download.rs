use crate::jobs::{Job, JobStatus, JobStore};
use crate::history::{self, HistoryEntry};
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FormatOption {
    pub id: String,
    pub label: String,
    pub height: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub title: String,
    pub thumbnail: String,
    pub duration: Option<f64>,
    pub uploader: String,
    pub formats: Vec<FormatOption>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPayload {
    pub job_id: String,
    pub progress: f32,
    pub speed: Option<String>,
    pub eta: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CompletePayload {
    pub job_id: String,
    pub filename: String,
    pub saved_path: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ErrorPayload {
    pub job_id: String,
    pub error: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusResponse {
    pub status: String,
    pub error: Option<String>,
    pub filename: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistEntryInfo {
    pub url: String,
    pub title: String,
    pub thumbnail: String,
    pub duration: Option<f64>,
    pub uploader: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistInfo {
    pub title: String,
    pub uploader: String,
    pub thumbnail: String,
    pub entry_count: u32,
    pub entries: Vec<PlaylistEntryInfo>,
}

/// Detect whether a URL is a playlist.
#[tauri::command]
pub async fn get_playlist_info(app: AppHandle, url: String) -> Result<PlaylistInfo, String> {
    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Failed to find yt-dlp: {}", e))?
        .args(["--flat-playlist", "-J", &url])
        .output()
        .await
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let last_line = stderr.lines().last().unwrap_or("Unknown error");
        return Err(last_line.to_string());
    }

    let info: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| format!("Failed to parse info: {}", e))?;

    // Check if this is actually a playlist (has _type: "playlist" and entries array)
    let is_playlist = info.get("_type").and_then(|t| t.as_str()) == Some("playlist");
    if !is_playlist {
        return Err("NOT_A_PLAYLIST".to_string());
    }

    let entries: Vec<PlaylistEntryInfo> = info
        .get("entries")
        .and_then(|e| e.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|e| {
                    let entry_url = e.get("url").and_then(|u| u.as_str())
                        .or_else(|| e.get("webpage_url").and_then(|u| u.as_str()))
                        .map(|u| u.to_string())?;
                    Some(PlaylistEntryInfo {
                        url: entry_url,
                        title: e.get("title").and_then(|t| t.as_str()).unwrap_or("").to_string(),
                        thumbnail: e.get("thumbnails")
                            .and_then(|t| t.as_array())
                            .and_then(|arr| arr.last())
                            .and_then(|t| t.get("url"))
                            .and_then(|u| u.as_str())
                            .unwrap_or("")
                            .to_string(),
                        duration: e.get("duration").and_then(|d| d.as_f64()),
                        uploader: e.get("uploader").and_then(|u| u.as_str()).unwrap_or("").to_string(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    let entry_count = entries.len() as u32;

    Ok(PlaylistInfo {
        title: info.get("title").and_then(|t| t.as_str()).unwrap_or("Playlist").to_string(),
        uploader: info.get("uploader").and_then(|u| u.as_str()).unwrap_or("").to_string(),
        thumbnail: info.get("thumbnails")
            .and_then(|t| t.as_array())
            .and_then(|arr| arr.last())
            .and_then(|t| t.get("url"))
            .and_then(|u| u.as_str())
            .unwrap_or("")
            .to_string(),
        entry_count,
        entries,
    })
}

/// Fetch video metadata and available formats.
/// Replaces POST /api/info from app.py:81-124
#[tauri::command]
pub async fn get_info(app: AppHandle, url: String) -> Result<VideoInfo, String> {
    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Failed to find yt-dlp: {}", e))?
        .args(["--no-playlist", "-j", &url])
        .output()
        .await
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let last_line = stderr.lines().last().unwrap_or("Unknown error");
        return Err(last_line.to_string());
    }

    let info: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| format!("Failed to parse info: {}", e))?;

    // Deduplicate formats by height, keeping the best bitrate per resolution
    // (ports app.py:97-112)
    let mut best_by_height: HashMap<u32, (String, f64)> = HashMap::new();

    if let Some(formats) = info.get("formats").and_then(|f| f.as_array()) {
        for f in formats {
            let height = match f.get("height").and_then(|h| h.as_u64()) {
                Some(h) if h > 0 => h as u32,
                _ => continue,
            };
            let vcodec = f.get("vcodec").and_then(|v| v.as_str()).unwrap_or("none");
            if vcodec == "none" {
                continue;
            }
            let tbr = f.get("tbr").and_then(|t| t.as_f64()).unwrap_or(0.0);
            let format_id = f.get("format_id").and_then(|id| id.as_str()).unwrap_or("").to_string();

            let is_better = best_by_height
                .get(&height)
                .map_or(true, |(_, existing_tbr)| tbr > *existing_tbr);

            if is_better {
                best_by_height.insert(height, (format_id, tbr));
            }
        }
    }

    let mut format_options: Vec<FormatOption> = best_by_height
        .into_iter()
        .map(|(height, (id, _))| FormatOption {
            id,
            label: format!("{}p", height),
            height,
        })
        .collect();

    format_options.sort_by(|a, b| b.height.cmp(&a.height));

    Ok(VideoInfo {
        title: info.get("title").and_then(|t| t.as_str()).unwrap_or("").to_string(),
        thumbnail: info.get("thumbnail").and_then(|t| t.as_str()).unwrap_or("").to_string(),
        duration: info.get("duration").and_then(|d| d.as_f64()),
        uploader: info.get("uploader").and_then(|u| u.as_str()).unwrap_or("").to_string(),
        formats: format_options,
    })
}

/// Start a download job. Returns the job ID.
/// Replaces POST /api/download (app.py:127-145) + run_download (app.py:16-73)
#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    state: tauri::State<'_, JobStore>,
    url: String,
    format: String,
    format_id: Option<String>,
    title: String,
    output_format: Option<String>,
    thumbnail: Option<String>,
) -> Result<String, String> {
    let job_id = uuid::Uuid::new_v4().to_string()[..10].to_string();

    // Create download directory in app data
    let download_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("downloads");

    std::fs::create_dir_all(&download_dir)
        .map_err(|e| format!("Failed to create download dir: {}", e))?;

    let out_template = download_dir
        .join(format!("{}.%(ext)s", job_id))
        .to_string_lossy()
        .to_string();

    // Locate ffmpeg sidecar binary for format merging/conversion.
    // The binary is named ffmpeg-{target_triple}.exe — yt-dlp needs the full path
    // since it won't find it by just searching for "ffmpeg.exe" in a directory.
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()));

    let ffmpeg_binary = exe_dir.as_ref().and_then(|dir| {
        // Production: next to exe
        let prod = dir.join("ffmpeg-x86_64-pc-windows-msvc.exe");
        if prod.exists() { return Some(prod); }
        // Dev mode: ../../binaries/
        let dev = dir.join("../../binaries/ffmpeg-x86_64-pc-windows-msvc.exe");
        if dev.exists() { return Some(std::fs::canonicalize(&dev).unwrap_or(dev)); }
        None
    });

    // Build yt-dlp args
    let mut args: Vec<String> = vec![
        "--no-playlist".into(),
        "--newline".into(),
        "--progress-template".into(),
        "download:DLP%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s".into(),
        "-o".into(),
        out_template,
    ];

    // Pass the full path to the ffmpeg binary
    if let Some(ref ffmpeg_path) = ffmpeg_binary {
        args.extend(["--ffmpeg-location".into(), ffmpeg_path.to_string_lossy().to_string()]);
    }

    let out_fmt = output_format.unwrap_or_default().clone();

    if format == "audio" {
        let audio_fmt = if out_fmt.is_empty() { "mp3".to_string() } else { out_fmt.clone() };
        args.extend(["-x".into(), "--audio-format".into(), audio_fmt]);
        // Use format_id as audio quality (e.g., "320", "192", "128") if provided
        if let Some(ref quality) = format_id {
            args.extend(["--audio-quality".into(), format!("{}K", quality)]);
        }
    } else {
        let video_fmt = if out_fmt.is_empty() { "mp4".to_string() } else { out_fmt.clone() };
        // Formats natively supported by --merge-output-format
        let native_merge = ["mp4", "mkv", "webm", "flv", "ogg"];
        let use_recode = !native_merge.contains(&video_fmt.as_str());

        if let Some(ref fid) = format_id {
            args.extend(["-f".into(), format!("{}+bestaudio/best", fid)]);
        } else {
            args.extend(["-f".into(), "bestvideo+bestaudio/best".into()]);
        }

        if use_recode {
            // For formats like MOV, download as mp4 then recode
            args.extend([
                "--merge-output-format".into(), "mp4".into(),
                "--recode-video".into(), video_fmt,
            ]);
        } else {
            args.extend(["--merge-output-format".into(), video_fmt]);
        }
    }

    args.push(url.clone());

    // Insert job into store
    let job = Job {
        id: job_id.clone(),
        url: url.clone(),
        title: title.clone(),
        status: JobStatus::Downloading { progress: 0.0 },
    };
    state.insert(job).await;

    // Spawn yt-dlp sidecar
    let (mut rx, _child) = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Failed to find yt-dlp: {}", e))?
        .args(&args)
        .spawn()
        .map_err(|e| format!("Failed to spawn yt-dlp: {}", e))?;

    // Read config to determine auto-save directory
    let cfg = crate::config::read_config(&app);
    let save_dir = match cfg.download_path {
        Some(ref p) => std::path::PathBuf::from(p),
        None => app
            .path()
            .download_dir()
            .unwrap_or_else(|_| download_dir.clone()),
    };
    std::fs::create_dir_all(&save_dir).ok();

    // Data for history entry + notifications
    let dl_url = url.clone();
    let dl_format = format.clone();
    let dl_output_format = out_fmt.clone();
    let dl_quality = format_id.clone().unwrap_or_default();
    let dl_thumbnail = thumbnail.unwrap_or_default();
    let notifications_enabled = cfg.notifications_enabled;

    // Spawn async task to read progress events
    let app_handle = app.clone();
    let store = state.inner().clone();
    let jid = job_id.clone();
    let is_audio = format == "audio";
    // Map yt-dlp format names to actual file extensions
    let fmt_to_ext = |fmt: &str| -> String {
        match fmt {
            "vorbis" => "ogg".to_string(),
            other => other.to_string(),
        }
    };
    let expected_ext = if is_audio {
        let ext = if out_fmt.is_empty() { "mp3".to_string() } else { fmt_to_ext(&out_fmt) };
        format!(".{}", ext)
    } else {
        let ext = if out_fmt.is_empty() { "mp4".to_string() } else { fmt_to_ext(&out_fmt) };
        format!(".{}", ext)
    };
    let dl_dir = download_dir.clone();

    tokio::spawn(async move {
        let mut stderr_lines: Vec<String> = Vec::new();

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let line_str = String::from_utf8_lossy(&line);
                    // Parse progress: "DLP 45.2%|1.5MiB/s|00:23"
                    if let Some(rest) = line_str.strip_prefix("DLP") {
                        let parts: Vec<&str> = rest.split('|').collect();
                        let pct_str = parts.first().unwrap_or(&"").trim().trim_end_matches('%').trim();
                        if let Ok(pct) = pct_str.parse::<f32>() {
                            let speed = parts.get(1).map(|s| s.trim().to_string()).filter(|s| !s.is_empty() && s != "N/A" && s != "Unknown");
                            let eta = parts.get(2).map(|s| s.trim().to_string()).filter(|s| !s.is_empty() && s != "N/A" && s != "Unknown");
                            store.update_progress(&jid, pct).await;
                            let _ = app_handle.emit(
                                "download-progress",
                                ProgressPayload {
                                    job_id: jid.clone(),
                                    progress: pct,
                                    speed,
                                    eta,
                                },
                            );
                        }
                    }
                }
                CommandEvent::Stderr(line) => {
                    let line_str = String::from_utf8_lossy(&line).to_string();
                    stderr_lines.push(line_str);
                }
                CommandEvent::Terminated(status) => {
                    let success = status.code.map_or(false, |c| c == 0);

                    if !success {
                        let err_msg = stderr_lines
                            .last()
                            .cloned()
                            .unwrap_or_else(|| "Download failed".to_string());
                        store.mark_error(&jid, err_msg.clone()).await;
                        let _ = app_handle.emit(
                            "download-error",
                            ErrorPayload {
                                job_id: jid.clone(),
                                error: err_msg,
                            },
                        );
                        return;
                    }

                    // Find the output file (same logic as app.py:38-56)
                    let pattern = dl_dir.join(format!("{}.*", jid));
                    let pattern_str = pattern.to_string_lossy().to_string();
                    let files: Vec<PathBuf> = glob::glob(&pattern_str)
                        .map(|paths| paths.filter_map(|p| p.ok()).collect())
                        .unwrap_or_default();

                    if files.is_empty() {
                        store
                            .mark_error(&jid, "Download completed but no file was found".into())
                            .await;
                        let _ = app_handle.emit(
                            "download-error",
                            ErrorPayload {
                                job_id: jid.clone(),
                                error: "Download completed but no file was found".into(),
                            },
                        );
                        return;
                    }

                    // Pick the right file based on the requested output format
                    let target_ext = expected_ext.as_str();
                    let chosen = files
                        .iter()
                        .find(|f| {
                            f.to_string_lossy().ends_with(target_ext)
                        })
                        .unwrap_or(&files[0])
                        .clone();

                    // Clean up extra files
                    for f in &files {
                        if f != &chosen {
                            let _ = std::fs::remove_file(f);
                        }
                    }

                    // Build filename: use title, sanitize for filesystem
                    let ext = chosen
                        .extension()
                        .map(|e| format!(".{}", e.to_string_lossy()))
                        .unwrap_or_default();

                    let filename = if !title.is_empty() {
                        let safe: String = title
                            .chars()
                            .filter(|c| !r#"\/:*?"<>|"#.contains(*c))
                            .collect::<String>()
                            .trim()
                            .chars()
                            .take(200)
                            .collect::<String>()
                            .trim()
                            .to_string();
                        if safe.is_empty() {
                            chosen
                                .file_name()
                                .map(|n| n.to_string_lossy().to_string())
                                .unwrap_or_else(|| format!("{}{}", jid, ext))
                        } else {
                            format!("{}{}", safe, ext)
                        }
                    } else {
                        chosen
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_else(|| format!("{}{}", jid, ext))
                    };

                    // Auto-save to configured download directory
                    let dest = save_dir.join(&filename);
                    let final_dest = if dest.exists() {
                        let stem = dest.file_stem().unwrap_or_default().to_string_lossy().to_string();
                        let fext = dest.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
                        let mut counter = 1;
                        loop {
                            let candidate = save_dir.join(format!("{} ({}){}", stem, counter, fext));
                            if !candidate.exists() { break candidate; }
                            counter += 1;
                        }
                    } else {
                        dest
                    };
                    let saved_path_str = if let Err(e) = std::fs::copy(&chosen, &final_dest) {
                        // Auto-save failed; file still in app data dir
                        format!("Save failed: {}", e)
                    } else {
                        final_dest.to_string_lossy().to_string()
                    };

                    // Append to download history
                    let entry = HistoryEntry {
                        id: uuid::Uuid::new_v4().to_string(),
                        url: dl_url.clone(),
                        title: title.clone(),
                        uploader: String::new(),
                        thumbnail: dl_thumbnail.clone(),
                        filename: filename.clone(),
                        saved_path: saved_path_str.clone(),
                        format: dl_format.clone(),
                        output_format: dl_output_format.clone(),
                        quality: dl_quality.clone(),
                        timestamp: chrono::Utc::now().timestamp(),
                    };
                    history::append_history(&app_handle, entry);

                    // Fire native notification if enabled
                    if notifications_enabled {
                        let _ = app_handle.notification()
                            .builder()
                            .title("Download Complete")
                            .body(&format!("{} has been saved", filename))
                            .show();
                    }

                    store.mark_done(&jid, chosen, filename.clone()).await;
                    let _ = app_handle.emit(
                        "download-complete",
                        CompletePayload {
                            job_id: jid.clone(),
                            filename,
                            saved_path: saved_path_str,
                        },
                    );
                }
                _ => {}
            }
        }
    });

    Ok(job_id)
}

/// Check download status.
/// Replaces GET /api/status/<job_id> (app.py:148-157)
#[tauri::command]
pub async fn get_status(
    state: tauri::State<'_, JobStore>,
    job_id: String,
) -> Result<StatusResponse, String> {
    let job = state.get(&job_id).await.ok_or("Job not found")?;

    match &job.status {
        JobStatus::Downloading { progress: _ } => Ok(StatusResponse {
            status: "downloading".into(),
            error: None,
            filename: None,
        }),
        JobStatus::Done { filename, .. } => Ok(StatusResponse {
            status: "done".into(),
            error: None,
            filename: Some(filename.clone()),
        }),
        JobStatus::Error { message } => Ok(StatusResponse {
            status: "error".into(),
            error: Some(message.clone()),
            filename: None,
        }),
    }
}

/// Save completed download file to the user's Downloads folder.
/// Replaces GET /api/file/<job_id> (app.py:160-165)
#[tauri::command]
pub async fn save_file(
    app: AppHandle,
    state: tauri::State<'_, JobStore>,
    job_id: String,
) -> Result<String, String> {
    let job = state.get(&job_id).await.ok_or("Job not found")?;

    match &job.status {
        JobStatus::Done {
            file_path,
            filename,
        } => {
            let source = PathBuf::from(file_path);
            if !source.exists() {
                return Err("File no longer exists".into());
            }

            let downloads_dir = app
                .path()
                .download_dir()
                .map_err(|e| format!("Failed to get Downloads folder: {}", e))?;

            let dest = downloads_dir.join(filename);

            // Handle name conflicts by appending (1), (2), etc.
            let final_dest = if dest.exists() {
                let stem = dest.file_stem().unwrap_or_default().to_string_lossy().to_string();
                let ext = dest.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
                let mut counter = 1;
                loop {
                    let candidate = downloads_dir.join(format!("{} ({}){}", stem, counter, ext));
                    if !candidate.exists() {
                        break candidate;
                    }
                    counter += 1;
                }
            } else {
                dest
            };

            std::fs::copy(&source, &final_dest)
                .map_err(|e| format!("Failed to save file: {}", e))?;

            Ok(final_dest.file_name().unwrap_or_default().to_string_lossy().to_string())
        }
        _ => Err("File not ready".into()),
    }
}
