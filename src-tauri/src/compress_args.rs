use serde::Deserialize;
use crate::ffmpeg_args::{resolve_hw_accel, resolve_video_encoder, parse_resolution};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressionSettings {
    pub preset: String,
    pub target_size_mb: Option<f64>,
    pub quality: u32,
    pub resolution: Option<String>,
    pub frame_rate: Option<String>,
    pub audio_mode: String,
    pub audio_bitrate: String,
    pub encoder_speed: String,
    pub hw_accel: Option<String>,
    pub strip_metadata: bool,
    pub strip_subtitles: bool,
    pub output_format: String,
}

/// Audio-only output formats — these MUST strip video and only encode audio.
const AUDIO_ONLY_FORMATS: &[&str] = &["mp3", "flac", "wav", "ogg", "opus", "m4a", "aac"];

#[cfg(target_os = "windows")]
const NULL_DEVICE: &str = "NUL";
#[cfg(not(target_os = "windows"))]
const NULL_DEVICE: &str = "/dev/null";

/// Pick the right video codec for the output container.
/// Compression defaults to H.264, but WebM requires VP9.
fn video_codec_for_container(container: &str) -> &'static str {
    match container {
        "webm" => "vp9",
        _ => "h264", // MP4, MKV, MOV, AVI all support H.264
    }
}

/// Pick the right audio codec for the output container.
fn audio_codec_for_container(container: &str) -> &'static str {
    match container {
        "webm" => "opus",
        "ogg" => "vorbis",
        _ => "aac", // MP4, MKV, MOV all support AAC
    }
}

/// Resolve the correct audio encoder for an audio-only output format.
fn audio_encoder_for_format(format: &str) -> &'static str {
    match format {
        "mp3" => "libmp3lame",
        "ogg" => "libvorbis",
        "opus" => "libopus",
        "flac" => "flac",
        "wav" => "pcm_s16le",
        "m4a" | "aac" => "aac",
        _ => "aac",
    }
}

/// Resolve the encoder name for a given audio codec id.
fn resolve_audio_enc(codec: &str) -> &'static str {
    match codec {
        "aac" => "aac",
        "opus" => "libopus",
        "vorbis" => "libvorbis",
        "mp3" => "libmp3lame",
        "flac" => "flac",
        _ => "aac",
    }
}

/// Build ffmpeg args for single-pass compression.
/// Handles both video and audio-only files based on output format.
/// Automatically fixes codec-container compatibility.
pub fn build_compress_args(
    input_path: &str,
    output_path: &str,
    settings: &CompressionSettings,
    detected_gpu: Option<&str>,
) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();
    let out_fmt = settings.output_format.as_str();
    let is_audio_output = AUDIO_ONLY_FORMATS.contains(&out_fmt);

    args.push("-y".into());

    // Resolve HW acceleration
    let hw = resolve_hw_accel(
        settings.hw_accel.as_deref().unwrap_or("software"),
        detected_gpu,
    );

    let is_scaling = settings.resolution.as_deref().unwrap_or("original") != "original";

    // GPU input decode acceleration — safe when not using CPU-based video filters.
    // When scaling is active, decoded frames must go through CPU filters, which
    // can cause format mismatches. Only enable for straight GPU decode → GPU encode.
    if !is_audio_output && !is_scaling {
        match hw.as_str() {
            "nvenc" => args.extend(["-hwaccel".into(), "cuda".into()]),
            "qsv" => args.extend(["-hwaccel".into(), "qsv".into()]),
            "amf" => args.extend(["-hwaccel".into(), "auto".into()]),
            _ => {}
        }
    }

    // Use all CPU cores for encoding/decoding
    args.extend(["-threads".into(), "0".into()]);

    // Input
    args.extend(["-i".into(), input_path.to_string()]);

    if is_audio_output {
        // ─── AUDIO-ONLY OUTPUT ───
        args.push("-vn".into());

        let encoder = audio_encoder_for_format(out_fmt);
        args.extend(["-c:a".into(), encoder.into()]);

        // Bitrate (skip for lossless)
        if out_fmt != "flac" && out_fmt != "wav" {
            args.extend(["-b:a".into(), settings.audio_bitrate.clone()]);
        }
    } else {
        // ─── VIDEO OUTPUT ───
        // Pick codec that's compatible with the output container
        let vcodec = video_codec_for_container(out_fmt);
        let encoder = resolve_video_encoder(vcodec, &hw);
        args.extend(["-c:v".into(), encoder]);

        // Quality / bitrate settings
        let crf = settings.quality;

        // Ensure compatible pixel format for encoding.
        // NVENC/AMF/QSV require 8-bit yuv420p (can't handle 10-bit, yuv444p, etc.)
        // Software encoders also benefit from explicit pix_fmt for consistency.
        args.extend(["-pix_fmt".into(), "yuv420p".into()]);

        // VP9 and AV1 always use software encoder with CRF (HW encoders have limited CRF support)
        if vcodec == "vp9" {
            // VP9 CRF requires -b:v 0 to enable quality mode
            args.extend(["-b:v".into(), "0".into(), "-crf".into(), crf.to_string()]);
            // VP9 doesn't use -preset, it uses -cpu-used (0=slowest, 8=fastest)
            let cpu_used = match settings.encoder_speed.as_str() {
                "ultrafast" => "8",
                "veryfast" => "6",
                "faster" => "5",
                "medium" => "4",
                "slow" => "2",
                "veryslow" => "1",
                _ => "4",
            };
            args.extend(["-cpu-used".into(), cpu_used.into()]);
            // VP9 needs row-mt for reasonable performance
            args.extend(["-row-mt".into(), "1".into()]);
        } else {
            // H.264 / H.265 path
            match hw.as_str() {
                "nvenc" => {
                    args.extend(["-rc".into(), "vbr".into()]);
                    args.extend(["-cq".into(), crf.to_string(), "-preset".into(), "p4".into()]);
                }
                "amf" => {
                    args.extend([
                        "-quality".into(), "speed".into(),
                        "-rc".into(), "cqp".into(),
                        "-qp_i".into(), crf.to_string(),
                        "-qp_p".into(), crf.to_string(),
                    ]);
                }
                "qsv" => {
                    args.extend(["-global_quality".into(), crf.to_string(), "-preset".into(), "faster".into()]);
                }
                _ => {
                    args.extend(["-crf".into(), crf.to_string()]);
                    args.extend(["-preset".into(), settings.encoder_speed.clone()]);
                }
            }
        }

        // Resolution
        if let Some(ref res) = settings.resolution {
            if res != "original" {
                let (w, h) = parse_resolution(res);
                if w > 0 {
                    // Use -2 for auto-calculated dimension to ensure even numbers
                    let scale = format!("scale={}:{}", w, if h > 0 { h.to_string() } else { "-2".to_string() });
                    args.extend(["-vf".into(), scale]);
                }
            }
        }

        // Frame rate
        if let Some(ref fps) = settings.frame_rate {
            if fps != "original" {
                args.extend(["-r".into(), fps.clone()]);
            }
        }

        // Audio track handling — use container-compatible codec
        let audio_enc = audio_codec_for_container(out_fmt);
        match settings.audio_mode.as_str() {
            "strip" => {
                args.push("-an".into());
            }
            "compress" => {
                args.extend(["-c:a".into(), resolve_audio_enc(audio_enc).into()]);
                args.extend(["-b:a".into(), settings.audio_bitrate.clone()]);
            }
            _ => {
                // "keep" — copy audio stream as-is
                args.extend(["-c:a".into(), "copy".into()]);
            }
        }

        // Strip subtitles (video only)
        if settings.strip_subtitles {
            args.push("-sn".into());
        }
    }

    // Strip metadata
    if settings.strip_metadata {
        args.extend(["-map_metadata".into(), "-1".into()]);
    }

    // Progress output
    args.extend(["-progress".into(), "pipe:1".into(), "-nostats".into()]);

    // Output
    args.push(output_path.to_string());

    args
}

/// Build ffmpeg args for two-pass target-size compression.
/// Returns (pass1_args, pass2_args).
/// Two-pass uses software encoding (libx264) — HW encoders don't support `-pass`.
pub fn build_two_pass_args(
    input_path: &str,
    output_path: &str,
    settings: &CompressionSettings,
    duration_secs: f64,
    passlog_prefix: &str,
) -> (Vec<String>, Vec<String>) {
    let target_bytes = settings.target_size_mb.unwrap_or(25.0) * 1024.0 * 1024.0;
    let audio_bitrate_bps: f64 = match settings.audio_mode.as_str() {
        "strip" => 0.0,
        _ => {
            let kbps = settings.audio_bitrate.replace("k", "").replace("K", "")
                .parse::<f64>().unwrap_or(128.0);
            kbps * 1000.0
        }
    };
    let video_bitrate_bps = ((target_bytes * 8.0) / duration_secs) - audio_bitrate_bps;
    let video_bitrate_kbps = (video_bitrate_bps / 1000.0).max(100.0) as u32;
    let bitrate_str = format!("{}k", video_bitrate_kbps);

    // Shared video filter / rate args
    let mut shared_video: Vec<String> = Vec::new();
    if let Some(ref res) = settings.resolution {
        if res != "original" {
            let (w, h) = parse_resolution(res);
            if w > 0 {
                let scale = format!("scale={}:{}", w, if h > 0 { h.to_string() } else { "-2".to_string() });
                shared_video.extend(["-vf".into(), scale]);
            }
        }
    }
    if let Some(ref fps) = settings.frame_rate {
        if fps != "original" {
            shared_video.extend(["-r".into(), fps.clone()]);
        }
    }

    let passlog = passlog_prefix.replace('\\', "/");
    let out_fmt = settings.output_format.as_str();
    let audio_enc = audio_codec_for_container(out_fmt);

    // === Pass 1 ===
    let mut pass1: Vec<String> = Vec::new();
    pass1.push("-y".into());
    pass1.extend(["-threads".into(), "0".into()]);
    pass1.extend(["-i".into(), input_path.to_string()]);
    pass1.extend(["-c:v".into(), "libx264".into()]);
    pass1.extend(["-b:v".into(), bitrate_str.clone()]);
    pass1.extend(["-preset".into(), settings.encoder_speed.clone()]);
    pass1.extend(["-pass".into(), "1".into()]);
    pass1.extend(["-passlogfile".into(), passlog.clone()]);
    pass1.extend(shared_video.clone());
    pass1.push("-an".into());
    pass1.extend(["-f".into(), "null".into()]);
    pass1.extend(["-progress".into(), "pipe:1".into(), "-nostats".into()]);
    pass1.push(NULL_DEVICE.into());

    // === Pass 2 ===
    let mut pass2: Vec<String> = Vec::new();
    pass2.push("-y".into());
    pass2.extend(["-threads".into(), "0".into()]);
    pass2.extend(["-i".into(), input_path.to_string()]);
    pass2.extend(["-c:v".into(), "libx264".into()]);
    pass2.extend(["-b:v".into(), bitrate_str]);
    pass2.extend(["-preset".into(), settings.encoder_speed.clone()]);
    pass2.extend(["-pass".into(), "2".into()]);
    pass2.extend(["-passlogfile".into(), passlog]);
    pass2.extend(shared_video);

    // Audio in pass 2
    match settings.audio_mode.as_str() {
        "strip" => {
            pass2.push("-an".into());
        }
        "compress" => {
            pass2.extend(["-c:a".into(), resolve_audio_enc(audio_enc).into()]);
            pass2.extend(["-b:a".into(), settings.audio_bitrate.clone()]);
        }
        _ => {
            pass2.extend(["-c:a".into(), "copy".into()]);
        }
    }

    if settings.strip_metadata {
        pass2.extend(["-map_metadata".into(), "-1".into()]);
    }
    if settings.strip_subtitles {
        pass2.push("-sn".into());
    }

    pass2.extend(["-progress".into(), "pipe:1".into(), "-nostats".into()]);
    pass2.push(output_path.to_string());

    (pass1, pass2)
}

/// Clean up ffmpeg two-pass log files.
pub fn cleanup_passlog(prefix: &str) {
    for suffix in &["-0.log", "-0.log.mbtree"] {
        let path = format!("{}{}", prefix, suffix);
        let _ = std::fs::remove_file(&path);
    }
}
