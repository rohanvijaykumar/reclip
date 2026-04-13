import type { MediaInfo } from "./converter";

export type CompressionPreset =
  | "quick-shrink"
  | "balanced"
  | "maximum"
  | "social-media"
  | "email-friendly"
  | "custom";

export type AudioCompressionPreset =
  | "high-quality"
  | "balanced"
  | "small-file"
  | "tiny"
  | "custom";

export type AudioMode = "keep" | "compress" | "strip";

export interface CompressionSettings {
  preset: CompressionPreset | AudioCompressionPreset;
  targetSizeMb: number | null;
  quality: number;            // CRF for video (18-40)
  resolution: string;
  frameRate: string;
  audioMode: AudioMode;
  audioBitrate: string;       // e.g. "128k", "192k", "320k" — used for audio-only files
  encoderSpeed: string;
  hwAccel: string;
  stripMetadata: boolean;
  stripSubtitles: boolean;
  outputFormat: string;
}

export type CompressCardStatus = "probing" | "ready" | "compressing" | "done" | "error" | "cancelled";

export interface CompressCard {
  id: string;
  filePath: string;
  fileName: string;
  customOutputName: string;
  mediaInfo: MediaInfo | null;
  settings: CompressionSettings;
  status: CompressCardStatus;
  jobId: string | null;
  progress: number | null;
  speed: string | null;
  currentPass: number | null;
  totalPasses: number | null;
  outputPath: string | null;
  outputFilename: string | null;
  outputSize: number | null;
  error: string | null;
}

export interface CompressProgressPayload {
  jobId: string;
  progress: number;
  speed: string | null;
  pass: number | null;
  totalPasses: number | null;
}

export interface CompressCompletePayload {
  jobId: string;
  outputPath: string;
  outputFilename: string;
  outputSize: number;
}

export interface CompressErrorPayload {
  jobId: string;
  error: string;
}

// ─── Video presets ───────────────────────────────────────────────

export const VIDEO_COMPRESSION_PRESETS = [
  { id: "quick-shrink" as const, label: "Quick Shrink", description: "Fast encode, moderate reduction" },
  { id: "balanced" as const, label: "Balanced", description: "Good quality, solid reduction" },
  { id: "maximum" as const, label: "Maximum", description: "Smallest file, slow encode" },
  { id: "social-media" as const, label: "Social Media", description: "1080p cap, upload-ready" },
  { id: "email-friendly" as const, label: "Email", description: "Target ~25 MB" },
  { id: "custom" as const, label: "Custom", description: "Fine-tune all settings" },
];

// ─── Audio presets ───────────────────────────────────────────────

export const AUDIO_COMPRESSION_PRESETS = [
  { id: "high-quality" as const, label: "High Quality", description: "320 kbps, near-lossless" },
  { id: "balanced" as const, label: "Balanced", description: "192 kbps, good quality" },
  { id: "small-file" as const, label: "Small File", description: "128 kbps, compact" },
  { id: "tiny" as const, label: "Tiny", description: "64 kbps, voice/podcast" },
  { id: "custom" as const, label: "Custom", description: "Fine-tune all settings" },
];

// ─── Format options ──────────────────────────────────────────────

export const VIDEO_OUTPUT_FORMATS = [
  { id: "mp4", label: "MP4" },
  { id: "mkv", label: "MKV" },
  { id: "webm", label: "WebM" },
  { id: "mov", label: "MOV" },
] as const;

export const AUDIO_OUTPUT_FORMATS = [
  { id: "mp3", label: "MP3" },
  { id: "ogg", label: "OGG" },
  { id: "opus", label: "OPUS" },
  { id: "flac", label: "FLAC" },
  { id: "wav", label: "WAV" },
  { id: "m4a", label: "M4A" },
] as const;

// ─── Settings options ────────────────────────────────────────────

export const COMPRESS_RESOLUTIONS = [
  { id: "original", label: "Original" },
  { id: "1920x1080", label: "1080p" },
  { id: "1280x720", label: "720p" },
  { id: "854x480", label: "480p" },
] as const;

export const COMPRESS_FRAME_RATES = [
  { id: "original", label: "Original" },
  { id: "30", label: "30 fps" },
  { id: "24", label: "24 fps" },
] as const;

export const AUDIO_MODES = [
  { id: "keep" as const, label: "Keep Original" },
  { id: "compress" as const, label: "Compress" },
  { id: "strip" as const, label: "Strip Audio" },
];

export const AUDIO_BITRATES = [
  { id: "320k", label: "320 kbps" },
  { id: "256k", label: "256 kbps" },
  { id: "192k", label: "192 kbps" },
  { id: "128k", label: "128 kbps" },
  { id: "96k", label: "96 kbps" },
  { id: "64k", label: "64 kbps" },
] as const;

export const ENCODER_SPEEDS = [
  { id: "ultrafast", label: "Ultra Fast" },
  { id: "veryfast", label: "Very Fast" },
  { id: "faster", label: "Faster" },
  { id: "medium", label: "Medium" },
  { id: "slow", label: "Slow" },
  { id: "veryslow", label: "Very Slow" },
] as const;

export const AUDIO_ONLY_FORMATS = ["mp3", "flac", "wav", "ogg", "opus", "m4a", "aac"];

// ─── Defaults ────────────────────────────────────────────────────

export function defaultVideoSettings(): CompressionSettings {
  return {
    preset: "balanced",
    targetSizeMb: null,
    quality: 26,
    resolution: "original",
    frameRate: "original",
    audioMode: "compress",
    audioBitrate: "128k",
    encoderSpeed: "medium",
    hwAccel: "auto",
    stripMetadata: true,
    stripSubtitles: false,
    outputFormat: "mp4",
  };
}

export function defaultAudioSettings(): CompressionSettings {
  return {
    preset: "balanced",
    targetSizeMb: null,
    quality: 26,
    resolution: "original",
    frameRate: "original",
    audioMode: "compress",
    audioBitrate: "192k",
    encoderSpeed: "medium",
    hwAccel: "software",
    stripMetadata: true,
    stripSubtitles: false,
    outputFormat: "mp3",
  };
}

// ─── Preset application ──────────────────────────────────────────

export function applyVideoPreset(preset: CompressionPreset, mediaInfo: MediaInfo | null): Partial<CompressionSettings> {
  switch (preset) {
    case "quick-shrink":
      return {
        preset: "quick-shrink",
        quality: 28,
        resolution: "original",
        frameRate: "original",
        audioMode: "compress",
        audioBitrate: "128k",
        encoderSpeed: "veryfast",
        stripMetadata: true,
        stripSubtitles: false,
        targetSizeMb: null,
      };
    case "balanced":
      return {
        preset: "balanced",
        quality: 26,
        resolution: "original",
        frameRate: "original",
        audioMode: "compress",
        audioBitrate: "128k",
        encoderSpeed: "medium",
        stripMetadata: true,
        stripSubtitles: false,
        targetSizeMb: null,
      };
    case "maximum":
      return {
        preset: "maximum",
        quality: 32,
        resolution: "original",
        frameRate: "24",
        audioMode: "compress",
        audioBitrate: "96k",
        encoderSpeed: "veryslow",
        stripMetadata: true,
        stripSubtitles: true,
        targetSizeMb: null,
      };
    case "social-media": {
      const needsDownscale = mediaInfo && mediaInfo.height && mediaInfo.height > 1080;
      return {
        preset: "social-media",
        quality: 28,
        resolution: needsDownscale ? "1920x1080" : "original",
        frameRate: "30",
        audioMode: "compress",
        audioBitrate: "128k",
        encoderSpeed: "medium",
        stripMetadata: true,
        stripSubtitles: true,
        targetSizeMb: null,
      };
    }
    case "email-friendly":
      return {
        preset: "email-friendly",
        quality: 30,
        resolution: "1280x720",
        frameRate: "24",
        audioMode: "compress",
        audioBitrate: "128k",
        encoderSpeed: "medium",
        stripMetadata: true,
        stripSubtitles: true,
        targetSizeMb: 25,
      };
    case "custom":
      return { preset: "custom" };
    default:
      return { preset: "balanced" };
  }
}

export function applyAudioPreset(preset: AudioCompressionPreset): Partial<CompressionSettings> {
  switch (preset) {
    case "high-quality":
      return {
        preset: "high-quality",
        audioBitrate: "320k",
        stripMetadata: true,
        targetSizeMb: null,
      };
    case "balanced":
      return {
        preset: "balanced",
        audioBitrate: "192k",
        stripMetadata: true,
        targetSizeMb: null,
      };
    case "small-file":
      return {
        preset: "small-file",
        audioBitrate: "128k",
        stripMetadata: true,
        targetSizeMb: null,
      };
    case "tiny":
      return {
        preset: "tiny",
        audioBitrate: "64k",
        stripMetadata: true,
        targetSizeMb: null,
      };
    case "custom":
      return { preset: "custom" };
    default:
      return { preset: "balanced" };
  }
}

// ─── Size estimation ─────────────────────────────────────────────

export function estimateCompressedSize(settings: CompressionSettings, mediaInfo: MediaInfo | null): number | null {
  if (!mediaInfo || mediaInfo.fileSize <= 0 || mediaInfo.durationSecs <= 0) return null;

  const isAudioOnly = !mediaInfo.hasVideo;
  const isAudioOutput = AUDIO_ONLY_FORMATS.includes(settings.outputFormat);

  // Target size mode: return the target
  if (settings.targetSizeMb != null && settings.targetSizeMb > 0) {
    return settings.targetSizeMb * 1024 * 1024;
  }

  // Audio-only file or audio-only output
  if (isAudioOnly || isAudioOutput) {
    const kbps = parseInt(settings.audioBitrate.replace(/[^0-9]/g, "")) || 192;
    return (kbps * 1000 / 8) * mediaInfo.durationSecs;
  }

  // Video compression estimation
  // CRF scaling: more conservative than the theoretical model.
  // Real-world: each CRF +1 reduces size by ~8-12%, with diminishing returns at extremes.
  // We use Math.pow(2, delta/10) which is gentler than the often-cited /6.
  // Also clamp: never estimate below 15% of original (CRF can't infinitely compress).
  const crfDelta = 23 - settings.quality; // negative when quality > 23 (smaller file)
  const crfFactor = Math.max(0.15, Math.pow(2, crfDelta / 10));

  // Resolution scaling (proportional to pixel count)
  let resFactor = 1;
  if (settings.resolution !== "original" && mediaInfo.width && mediaInfo.height) {
    const [tw, th] = settings.resolution.split("x").map(Number);
    const srcPixels = mediaInfo.width * mediaInfo.height;
    const tgtPixels = tw * th;
    if (srcPixels > 0 && tgtPixels > 0 && tgtPixels < srcPixels) {
      resFactor = tgtPixels / srcPixels;
    }
  }

  // Frame rate scaling
  let fpsFactor = 1;
  if (settings.frameRate !== "original" && mediaInfo.frameRate) {
    const targetFps = parseFloat(settings.frameRate);
    if (targetFps < mediaInfo.frameRate) {
      fpsFactor = targetFps / mediaInfo.frameRate;
    }
  }

  // Audio removal factor
  const audioFraction =
    mediaInfo.audioBitrate && mediaInfo.videoBitrate
      ? mediaInfo.audioBitrate / (mediaInfo.audioBitrate + mediaInfo.videoBitrate)
      : 0.1;
  const audioFactor = settings.audioMode === "strip" ? 1 - audioFraction : 1;

  return mediaInfo.fileSize * crfFactor * resFactor * fpsFactor * audioFactor;
}
