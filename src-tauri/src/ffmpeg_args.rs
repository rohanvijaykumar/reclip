use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionSettings {
    pub video_codec: Option<String>,
    pub resolution: Option<String>,
    pub frame_rate: Option<String>,
    pub bitrate_mode: Option<String>,
    pub crf_value: Option<u32>,
    pub video_bitrate: Option<String>,
    pub pixel_format: Option<String>,
    pub hw_accel: Option<String>,
    pub audio_codec: Option<String>,
    pub audio_bitrate: Option<String>,
    pub sample_rate: Option<String>,
    pub channels: Option<String>,
    pub volume: Option<f64>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub output_format: String,
}

/// Audio-only output containers that MUST strip video
const AUDIO_ONLY_FORMATS: &[&str] = &["mp3", "flac", "wav", "ogg", "opus", "m4a", "aac"];

/// Resolve "auto" hw_accel to the actual detected GPU encoder.
pub fn resolve_hw_accel(hw_accel: &str, detected_gpu: Option<&str>) -> String {
    match hw_accel {
        "auto" => detected_gpu.unwrap_or("software").to_string(),
        other => other.to_string(),
    }
}

/// Build the complete ffmpeg argument list from conversion settings.
/// Handles container-codec compatibility automatically.
/// `detected_gpu` is the cached GPU probe result (e.g. "nvenc", "amf", "qsv", "software").
pub fn build_ffmpeg_args(
    input_path: &str,
    output_path: &str,
    settings: &ConversionSettings,
    detected_gpu: Option<&str>,
) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();
    let out_fmt = settings.output_format.as_str();
    let is_audio_output = AUDIO_ONLY_FORMATS.contains(&out_fmt);

    // Always overwrite output
    args.push("-y".into());

    // Resolve "auto" to the actual detected encoder
    let hw = resolve_hw_accel(
        settings.hw_accel.as_deref().unwrap_or("software"),
        detected_gpu,
    );
    if !is_audio_output {
        match hw.as_str() {
            "nvenc" => args.extend(["-hwaccel".into(), "cuda".into()]),
            "qsv" => args.extend(["-hwaccel".into(), "qsv".into()]),
            "amf" => args.extend(["-hwaccel".into(), "auto".into()]),
            _ => {}
        }
    }

    // Trim start (before -i for fast seek)
    if let Some(ref ss) = settings.start_time {
        if !ss.is_empty() {
            args.extend(["-ss".into(), ss.clone()]);
        }
    }

    // Input file
    args.extend(["-i".into(), input_path.to_string()]);

    // Trim end (after -i)
    if let Some(ref to) = settings.end_time {
        if !to.is_empty() {
            args.extend(["-to".into(), to.clone()]);
        }
    }

    // --- Video settings ---
    if is_audio_output {
        // Audio-only output: always strip video
        args.push("-vn".into());
    } else {
        let vcodec = settings.video_codec.as_deref().unwrap_or("copy");
        // Auto-fix codec-container mismatches
        let effective_vcodec = fix_video_codec_for_container(vcodec, out_fmt);

        match effective_vcodec.as_str() {
            "none" => { args.push("-vn".into()); }
            "copy" => { args.extend(["-c:v".into(), "copy".into()]); }
            codec => {
                let encoder = resolve_video_encoder(codec, &hw);
                args.extend(["-c:v".into(), encoder]);

                // Resolution
                if let Some(ref res) = settings.resolution {
                    if res != "original" {
                        let (w, h) = parse_resolution(res);
                        if w > 0 {
                            args.extend(["-vf".into(), format!("scale={}:{}", w, if h > 0 { h.to_string() } else { "-2".to_string() })]);
                        }
                    }
                }

                // Frame rate
                if let Some(ref fps) = settings.frame_rate {
                    if fps != "original" {
                        args.extend(["-r".into(), fps.clone()]);
                    }
                }

                // Bitrate mode
                let bmode = settings.bitrate_mode.as_deref().unwrap_or("crf");
                match bmode {
                    "crf" => {
                        let crf = settings.crf_value.unwrap_or(23);
                        match hw.as_str() {
                            "nvenc" => {
                                // NVENC: use -cq for constant quality + preset for speed
                                args.extend(["-cq".into(), crf.to_string(), "-preset".into(), "p4".into()]);
                            }
                            "amf" => {
                                args.extend(["-quality".into(), "speed".into(), "-rc".into(), "cqp".into(), "-qp_i".into(), crf.to_string(), "-qp_p".into(), crf.to_string()]);
                            }
                            "qsv" => {
                                args.extend(["-global_quality".into(), crf.to_string(), "-preset".into(), "faster".into()]);
                            }
                            _ => {
                                if codec == "vp9" || codec == "av1" {
                                    args.extend(["-b:v".into(), "0".into(), "-crf".into(), crf.to_string()]);
                                } else {
                                    args.extend(["-crf".into(), crf.to_string()]);
                                }
                            }
                        }
                    }
                    "cbr" => {
                        if let Some(ref br) = settings.video_bitrate {
                            args.extend(["-b:v".into(), br.clone()]);
                            args.extend(["-maxrate".into(), br.clone()]);
                            let bufsize = br.replace("k", "").replace("K", "").parse::<u32>()
                                .map(|v| format!("{}k", v * 2))
                                .unwrap_or_else(|_| br.clone());
                            args.extend(["-bufsize".into(), bufsize]);
                        }
                    }
                    "vbr" => {
                        if let Some(ref br) = settings.video_bitrate {
                            args.extend(["-b:v".into(), br.clone()]);
                        }
                    }
                    _ => {}
                }

                // Pixel format
                if let Some(ref pf) = settings.pixel_format {
                    if !pf.is_empty() {
                        args.extend(["-pix_fmt".into(), pf.clone()]);
                    }
                }
            }
        }
    }

    // --- Audio settings ---
    let acodec = settings.audio_codec.as_deref().unwrap_or("copy");
    // Auto-fix audio codec for container
    let effective_acodec = fix_audio_codec_for_container(acodec, out_fmt);

    match effective_acodec.as_str() {
        "none" => { args.push("-an".into()); }
        "copy" => { args.extend(["-c:a".into(), "copy".into()]); }
        codec => {
            let encoder = resolve_audio_encoder(codec);
            args.extend(["-c:a".into(), encoder]);

            // Audio bitrate (not for lossless codecs)
            if codec != "flac" && codec != "wav" {
                if let Some(ref abr) = settings.audio_bitrate {
                    args.extend(["-b:a".into(), abr.clone()]);
                }
            }

            // Sample rate
            if let Some(ref sr) = settings.sample_rate {
                if sr != "original" {
                    args.extend(["-ar".into(), sr.clone()]);
                }
            }

            // Channels
            if let Some(ref ch) = settings.channels {
                if ch != "original" {
                    args.extend(["-ac".into(), ch.clone()]);
                }
            }
        }
    }

    // Volume adjustment (as audio filter, only if not copy/none)
    if effective_acodec != "copy" && effective_acodec != "none" {
        if let Some(vol) = settings.volume {
            if vol.abs() > 0.01 {
                args.extend(["-af".into(), format!("volume={}dB", vol)]);
            }
        }
    }

    // Progress output (machine-readable to stdout)
    args.extend(["-progress".into(), "pipe:1".into(), "-nostats".into()]);

    // Output file
    args.push(output_path.to_string());

    args
}

/// Fix video codec to be compatible with the output container.
/// E.g., WebM only supports VP9/VP8/AV1, not H.264.
fn fix_video_codec_for_container(codec: &str, container: &str) -> String {
    match container {
        "webm" => {
            match codec {
                "vp9" | "av1" | "copy" | "none" => codec.to_string(),
                _ => "vp9".to_string(), // Force VP9 for WebM
            }
        }
        _ => codec.to_string(),
    }
}

/// Fix audio codec to be compatible with the output container.
fn fix_audio_codec_for_container(codec: &str, container: &str) -> String {
    match container {
        "webm" => {
            match codec {
                "opus" | "vorbis" | "copy" | "none" => codec.to_string(),
                _ => "opus".to_string(), // Force Opus for WebM
            }
        }
        "mp3" => "mp3".to_string(),     // MP3 container only supports MP3 audio
        "flac" => "flac".to_string(),    // FLAC container only supports FLAC
        "wav" => "wav".to_string(),      // WAV uses PCM
        "ogg" => {
            match codec {
                "vorbis" | "opus" | "flac" | "copy" | "none" => codec.to_string(),
                _ => "vorbis".to_string(),
            }
        }
        "opus" => "opus".to_string(),    // Opus container only supports Opus
        _ => codec.to_string(),
    }
}

fn resolve_video_encoder(codec: &str, hw: &str) -> String {
    match (codec, hw) {
        ("h264", "nvenc") => "h264_nvenc".into(),
        ("h264", "amf") => "h264_amf".into(),
        ("h264", "qsv") => "h264_qsv".into(),
        ("h264", _) => "libx264".into(),
        ("h265", "nvenc") => "hevc_nvenc".into(),
        ("h265", "amf") => "hevc_amf".into(),
        ("h265", "qsv") => "hevc_qsv".into(),
        ("h265", _) => "libx265".into(),
        ("vp9", _) => "libvpx-vp9".into(),
        ("av1", "nvenc") => "av1_nvenc".into(),
        ("av1", "amf") => "av1_amf".into(),
        ("av1", "qsv") => "av1_qsv".into(),
        ("av1", _) => "libsvtav1".into(),
        (other, _) => other.into(),
    }
}

fn resolve_audio_encoder(codec: &str) -> String {
    match codec {
        "aac" => "aac".into(),
        "opus" => "libopus".into(),
        "mp3" => "libmp3lame".into(),
        "flac" => "flac".into(),
        "vorbis" => "libvorbis".into(),
        "wav" => "pcm_s16le".into(),
        other => other.into(),
    }
}

fn parse_resolution(res: &str) -> (u32, u32) {
    if let Some((w_str, h_str)) = res.split_once('x') {
        let w = w_str.parse::<u32>().unwrap_or(0);
        let h = h_str.parse::<u32>().unwrap_or(0);
        (w, h)
    } else {
        (0, 0)
    }
}
