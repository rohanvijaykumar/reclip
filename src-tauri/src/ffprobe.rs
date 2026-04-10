use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaInfo {
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub duration_secs: f64,
    pub has_video: bool,
    pub has_audio: bool,
    pub video_codec: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub frame_rate: Option<f64>,
    pub video_bitrate: Option<u64>,
    pub pixel_format: Option<String>,
    pub audio_codec: Option<String>,
    pub audio_bitrate: Option<u64>,
    pub sample_rate: Option<u32>,
    pub channels: Option<u32>,
    pub channel_layout: Option<String>,
    pub container_format: Option<String>,
}

/// Parse ffmpeg -i stderr output to extract media info.
/// Example lines:
///   Duration: 00:05:23.45, start: 0.000000, bitrate: 5234 kb/s
///   Stream #0:0: Video: h264 (High), yuv420p, 1920x1080, 5000 kb/s, 30 fps
///   Stream #0:1: Audio: aac (LC), 48000 Hz, stereo, fltp, 192 kb/s
pub fn parse_ffmpeg_info(stderr: &str, file_path: &str) -> MediaInfo {
    let path = Path::new(file_path);
    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let file_size = std::fs::metadata(file_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let mut info = MediaInfo {
        file_path: file_path.to_string(),
        file_name,
        file_size,
        duration_secs: 0.0,
        has_video: false,
        has_audio: false,
        video_codec: None,
        width: None,
        height: None,
        frame_rate: None,
        video_bitrate: None,
        pixel_format: None,
        audio_codec: None,
        audio_bitrate: None,
        sample_rate: None,
        channels: None,
        channel_layout: None,
        container_format: None,
    };

    for line in stderr.lines() {
        let trimmed = line.trim();

        // Container format: "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from ..."
        if trimmed.starts_with("Input #0") {
            if let Some(after) = trimmed.strip_prefix("Input #0, ") {
                if let Some(fmt) = after.split(',').next() {
                    info.container_format = Some(fmt.trim().to_string());
                }
            }
        }

        // Duration: 00:05:23.45, start: 0.000000, bitrate: 5234 kb/s
        if trimmed.starts_with("Duration:") {
            if let Some(dur_str) = trimmed.strip_prefix("Duration:") {
                let dur_part = dur_str.split(',').next().unwrap_or("").trim();
                info.duration_secs = parse_duration(dur_part);
            }
        }

        // Video stream
        if trimmed.contains("Video:") && !info.has_video {
            info.has_video = true;
            parse_video_stream(trimmed, &mut info);
        }

        // Audio stream
        if trimmed.contains("Audio:") && !info.has_audio {
            info.has_audio = true;
            parse_audio_stream(trimmed, &mut info);
        }
    }

    info
}

/// Parse "00:05:23.45" to seconds
fn parse_duration(s: &str) -> f64 {
    let parts: Vec<&str> = s.split(':').collect();
    if parts.len() == 3 {
        let h: f64 = parts[0].parse().unwrap_or(0.0);
        let m: f64 = parts[1].parse().unwrap_or(0.0);
        let sec: f64 = parts[2].parse().unwrap_or(0.0);
        h * 3600.0 + m * 60.0 + sec
    } else {
        0.0
    }
}

/// Parse video stream line like:
/// "Stream #0:0: Video: h264 (High), yuv420p, 1920x1080 [SAR 1:1 DAR 16:9], 155 kb/s, 30 fps"
fn parse_video_stream(line: &str, info: &mut MediaInfo) {
    // Extract codec name (first word after "Video: ")
    if let Some(after_video) = line.split("Video:").nth(1) {
        let parts: Vec<&str> = after_video.split(',').collect();

        // Codec: "h264 (High)" → "h264"
        if let Some(codec_part) = parts.first() {
            let codec = codec_part.trim().split_whitespace().next().unwrap_or("");
            info.video_codec = Some(codec.to_string());
        }

        // Search through parts for resolution, pixel format, bitrate, fps
        for part in &parts {
            let p = part.trim();

            // Pixel format: "yuv420p" or "yuv444p(progressive)"
            if p.starts_with("yuv") || p.starts_with("rgb") || p.starts_with("nv12") {
                let pf = p.split('(').next().unwrap_or(p).trim();
                info.pixel_format = Some(pf.to_string());
            }

            // Resolution: "1920x1080" possibly with SAR/DAR info
            if p.contains('x') && !p.contains("0x") {
                let res_part = p.split_whitespace().next().unwrap_or("");
                let dims: Vec<&str> = res_part.split('x').collect();
                if dims.len() == 2 {
                    if let (Ok(w), Ok(h)) = (dims[0].parse::<u32>(), dims[1].parse::<u32>()) {
                        if w > 0 && h > 0 && w < 20000 && h < 20000 {
                            info.width = Some(w);
                            info.height = Some(h);
                        }
                    }
                }
            }

            // Bitrate: "155 kb/s"
            if p.ends_with("kb/s") {
                let num = p.replace("kb/s", "").trim().parse::<u64>().ok();
                if num.is_some() {
                    info.video_bitrate = num;
                }
            }

            // Frame rate: "30 fps" or "29.97 fps"
            if p.ends_with("fps") {
                let num = p.replace("fps", "").trim().parse::<f64>().ok();
                if num.is_some() {
                    info.frame_rate = num;
                }
            }
        }
    }
}

/// Parse audio stream line like:
/// "Stream #0:1: Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 69 kb/s"
fn parse_audio_stream(line: &str, info: &mut MediaInfo) {
    if let Some(after_audio) = line.split("Audio:").nth(1) {
        let parts: Vec<&str> = after_audio.split(',').collect();

        // Codec: "aac (LC)" → "aac"
        if let Some(codec_part) = parts.first() {
            let codec = codec_part.trim().split_whitespace().next().unwrap_or("");
            info.audio_codec = Some(codec.to_string());
        }

        for part in &parts {
            let p = part.trim();

            // Sample rate: "44100 Hz" or "48000 Hz"
            if p.ends_with("Hz") {
                let num = p.replace("Hz", "").trim().parse::<u32>().ok();
                if num.is_some() {
                    info.sample_rate = num;
                }
            }

            // Channel layout: "stereo", "mono", "5.1"
            if p == "stereo" || p == "mono" || p.starts_with("5.1") || p.starts_with("7.1") {
                info.channel_layout = Some(p.to_string());
                info.channels = Some(match p {
                    "mono" => 1,
                    "stereo" => 2,
                    s if s.starts_with("5.1") => 6,
                    s if s.starts_with("7.1") => 8,
                    _ => 2,
                });
            }

            // Bitrate: "69 kb/s"
            if p.ends_with("kb/s") {
                let num = p.replace("kb/s", "").trim().parse::<u64>().ok();
                if num.is_some() {
                    info.audio_bitrate = num;
                }
            }
        }
    }
}
