export interface FormatOption {
  id: string;
  label: string;
  height: number;
}

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number | null;
  uploader: string;
  formats: FormatOption[];
}

export interface StatusResponse {
  status: string;
  error: string | null;
  filename: string | null;
}

export type CardStatus = "loading" | "ready" | "downloading" | "done" | "error" | "info-error";

export type FormatCategory = "video" | "audio";
export type VideoFormat = "mp4" | "mkv" | "webm" | "mov";
export type AudioFormat = "mp3" | "flac" | "wav" | "m4a" | "ogg" | "opus";
export type OutputFormat = VideoFormat | AudioFormat;

export const VIDEO_FORMATS: { id: VideoFormat; label: string }[] = [
  { id: "mp4", label: "MP4" },
  { id: "mkv", label: "MKV" },
  { id: "webm", label: "WebM" },
  { id: "mov", label: "MOV" },
];

export const AUDIO_FORMATS: { id: AudioFormat; label: string; ytdlpName: string }[] = [
  { id: "mp3", label: "MP3", ytdlpName: "mp3" },
  { id: "flac", label: "FLAC", ytdlpName: "flac" },
  { id: "wav", label: "WAV", ytdlpName: "wav" },
  { id: "m4a", label: "M4A", ytdlpName: "m4a" },
  { id: "ogg", label: "OGG", ytdlpName: "vorbis" },
  { id: "opus", label: "OPUS", ytdlpName: "opus" },
];

export interface CardData {
  url: string;
  status: CardStatus;
  title?: string;
  thumbnail?: string;
  duration?: number | null;
  uploader?: string;
  formats?: FormatOption[];
  selectedFormatId?: string | null;
  customFilename?: string;
  jobId?: string;
  progress?: number | null;
  speed?: string | null;
  eta?: string | null;
  filename?: string;
  saved?: boolean;
  savedName?: string;
  error?: string;
}

export interface ProgressPayload {
  jobId: string;
  progress: number;
  speed: string | null;
  eta: string | null;
}

export interface CompletePayload {
  jobId: string;
  filename: string;
  savedPath: string;
}

export interface ErrorPayload {
  jobId: string;
  error: string;
}

export interface AppConfig {
  downloadPath: string | null;
  defaultVideoQuality: string;
  notificationsEnabled: boolean;
  theme: "dark" | "light" | "system";
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  uploader: string;
  thumbnail: string;
  filename: string;
  savedPath: string;
  format: string;
  outputFormat: string;
  quality: string;
  timestamp: number;
}
