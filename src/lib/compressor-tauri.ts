import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { MediaInfo } from "@/types/converter";
import type {
  CompressionSettings,
  CompressProgressPayload,
  CompressCompletePayload,
  CompressErrorPayload,
} from "@/types/compressor";

// Reuse the same probe_file command from the converter backend
export async function probeFile(path: string): Promise<MediaInfo> {
  return invoke<MediaInfo>("probe_file", { path });
}

export async function startCompression(
  inputPath: string,
  settings: CompressionSettings,
  outputDir: string | null,
  outputFilename: string | null,
  durationSecs: number
): Promise<string> {
  return invoke<string>("start_compression", {
    inputPath,
    settings,
    outputDir,
    outputFilename,
    durationSecs,
  });
}

export async function cancelCompression(jobId: string): Promise<void> {
  return invoke("cancel_compression", { jobId });
}

export function onCompressProgress(cb: (p: CompressProgressPayload) => void): Promise<UnlistenFn> {
  return listen<CompressProgressPayload>("compress-progress", (e) => cb(e.payload));
}

export function onCompressComplete(cb: (p: CompressCompletePayload) => void): Promise<UnlistenFn> {
  return listen<CompressCompletePayload>("compress-complete", (e) => cb(e.payload));
}

export function onCompressError(cb: (p: CompressErrorPayload) => void): Promise<UnlistenFn> {
  return listen<CompressErrorPayload>("compress-error", (e) => cb(e.payload));
}
