export interface FormatOption {
  id: string;
  label: string;
  height: number;
  filesize?: number | null;
}

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number | null;
  uploader: string;
  formats: FormatOption[];
}

export interface PlaylistEntry {
  url: string;
  title: string;
  thumbnail: string;
  duration: number | null;
  uploader: string;
}

export interface PlaylistInfo {
  title: string;
  uploader: string;
  thumbnail: string;
  entryCount: number;
  entries: PlaylistEntry[];
}

export interface StatusResponse {
  status: string;
  error: string | null;
  filename: string | null;
}

export type CardStatus =
  | "loading"
  | "ready"
  | "queued"
  | "downloading"
  | "done"
  | "error"
  | "info-error"
  | "retrying";

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

export interface DuplicateInfo {
  date: string;
  quality: string;
  format: string;
}

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
  duplicateInfo?: DuplicateInfo | null;
  skipDuplicate?: boolean;
  // Queue
  queuePosition?: number;
  // Retry
  retryCount?: number;
  retryingIn?: number; // seconds remaining on countdown
  // Playlist
  playlistId?: string;
  checked?: boolean;
}

export interface PlaylistHeaderData {
  id: string;
  title: string;
  uploader: string;
  thumbnail: string;
  videoCount: number;
  totalDuration: number;
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
  clipboardWatchEnabled: boolean;
  hwAccelEnabled: boolean;
  detectedGpu: string | null;
  filenameTemplate: string;
  folderRules: Record<string, string>;
}

export interface GpuDetectionResult {
  hasNvenc: boolean;
  hasAmf: boolean;
  hasQsv: boolean;
  recommended: string;
  label: string;
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
