export interface MediaInfo {
  filePath: string;
  fileName: string;
  fileSize: number;
  durationSecs: number;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec: string | null;
  width: number | null;
  height: number | null;
  frameRate: number | null;
  videoBitrate: number | null;
  pixelFormat: string | null;
  audioCodec: string | null;
  audioBitrate: number | null;
  sampleRate: number | null;
  channels: number | null;
  channelLayout: string | null;
  containerFormat: string | null;
}

export interface ConversionSettings {
  videoCodec: string | null;
  resolution: string | null;
  frameRate: string | null;
  bitrateMode: string | null;
  crfValue: number | null;
  videoBitrate: string | null;
  pixelFormat: string | null;
  hwAccel: string | null;
  audioCodec: string | null;
  audioBitrate: string | null;
  sampleRate: string | null;
  channels: string | null;
  volume: number | null;
  startTime: string | null;
  endTime: string | null;
  outputFormat: string;
}

export interface ConvertProgressPayload {
  jobId: string;
  progress: number;
  speed: string | null;
}

export interface ConvertCompletePayload {
  jobId: string;
  outputPath: string;
  outputFilename: string;
  outputSize: number;
}

export interface ConvertErrorPayload {
  jobId: string;
  error: string;
}

export type ConvertCardStatus = "probing" | "ready" | "converting" | "done" | "error" | "cancelled";

export interface ConvertCard {
  id: string;
  filePath: string;
  fileName: string;
  customOutputName: string;
  mediaInfo: MediaInfo | null;
  settings: ConversionSettings;
  status: ConvertCardStatus;
  jobId: string | null;
  progress: number | null;
  speed: string | null;
  outputPath: string | null;
  outputFilename: string | null;
  outputSize: number | null;
  error: string | null;
}

export const OUTPUT_FORMATS = [
  { id: "mp4", label: "MP4", type: "video" as const },
  { id: "mkv", label: "MKV", type: "video" as const },
  { id: "webm", label: "WebM", type: "video" as const },
  { id: "mov", label: "MOV", type: "video" as const },
  { id: "avi", label: "AVI", type: "video" as const },
  { id: "mp3", label: "MP3", type: "audio" as const },
  { id: "flac", label: "FLAC", type: "audio" as const },
  { id: "wav", label: "WAV", type: "audio" as const },
  { id: "ogg", label: "OGG", type: "audio" as const },
  { id: "opus", label: "OPUS", type: "audio" as const },
];

export const VIDEO_CODECS = [
  { id: "h264", label: "H.264 (AVC)" },
  { id: "h265", label: "H.265 (HEVC)" },
  { id: "vp9", label: "VP9" },
  { id: "av1", label: "AV1" },
  { id: "copy", label: "Copy (No Re-encode)" },
  { id: "none", label: "Remove Video" },
];

export const AUDIO_CODECS = [
  { id: "aac", label: "AAC" },
  { id: "opus", label: "Opus" },
  { id: "mp3", label: "MP3" },
  { id: "flac", label: "FLAC (Lossless)" },
  { id: "vorbis", label: "Vorbis" },
  { id: "copy", label: "Copy (No Re-encode)" },
  { id: "none", label: "Remove Audio" },
];

export const RESOLUTIONS = [
  { id: "original", label: "Original" },
  { id: "3840x2160", label: "4K (3840x2160)" },
  { id: "2560x1440", label: "1440p (2560x1440)" },
  { id: "1920x1080", label: "1080p (1920x1080)" },
  { id: "1280x720", label: "720p (1280x720)" },
  { id: "854x480", label: "480p (854x480)" },
  { id: "640x360", label: "360p (640x360)" },
];

export const FRAME_RATES = [
  { id: "original", label: "Original" },
  { id: "60", label: "60 fps" },
  { id: "30", label: "30 fps" },
  { id: "24", label: "24 fps" },
  { id: "15", label: "15 fps" },
];

export const AUDIO_BITRATES = [
  { id: "64k", label: "64 kbps" },
  { id: "128k", label: "128 kbps" },
  { id: "192k", label: "192 kbps" },
  { id: "256k", label: "256 kbps" },
  { id: "320k", label: "320 kbps" },
];

export const SAMPLE_RATES = [
  { id: "original", label: "Original" },
  { id: "48000", label: "48 kHz" },
  { id: "44100", label: "44.1 kHz" },
  { id: "22050", label: "22.05 kHz" },
];

export const CHANNEL_OPTIONS = [
  { id: "original", label: "Original" },
  { id: "2", label: "Stereo" },
  { id: "1", label: "Mono" },
  { id: "6", label: "5.1 Surround" },
];

// HW accel is now auto-detected and controlled via Settings toggle.
// "auto" uses detected GPU, "software" forces CPU.

export function defaultSettings(): ConversionSettings {
  return {
    videoCodec: "h264",
    resolution: "original",
    frameRate: "original",
    bitrateMode: "crf",
    crfValue: 23,
    videoBitrate: null,
    pixelFormat: null,
    hwAccel: "auto",
    audioCodec: "aac",
    audioBitrate: "192k",
    sampleRate: "original",
    channels: "original",
    volume: 0,
    startTime: null,
    endTime: null,
    outputFormat: "mp4",
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
