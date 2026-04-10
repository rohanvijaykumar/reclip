import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { VideoInfo, ProgressPayload, CompletePayload, ErrorPayload } from "@/types";

export async function getInfo(url: string): Promise<VideoInfo> {
  return invoke<VideoInfo>("get_info", { url });
}

export async function startDownload(
  url: string,
  format: string,
  formatId: string | null,
  title: string,
  outputFormat: string
): Promise<string> {
  return invoke<string>("start_download", { url, format, formatId, title, outputFormat });
}

export async function saveFile(jobId: string): Promise<string> {
  return invoke<string>("save_file", { jobId });
}

export async function openDownloadFolder(): Promise<void> {
  return invoke("open_download_folder");
}

export function onDownloadProgress(cb: (p: ProgressPayload) => void): Promise<UnlistenFn> {
  return listen<ProgressPayload>("download-progress", (e) => cb(e.payload));
}

export function onDownloadComplete(cb: (p: CompletePayload) => void): Promise<UnlistenFn> {
  return listen<CompletePayload>("download-complete", (e) => cb(e.payload));
}

export function onDownloadError(cb: (p: ErrorPayload) => void): Promise<UnlistenFn> {
  return listen<ErrorPayload>("download-error", (e) => cb(e.payload));
}
