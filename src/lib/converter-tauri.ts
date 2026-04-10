import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  MediaInfo,
  ConversionSettings,
  ConvertProgressPayload,
  ConvertCompletePayload,
  ConvertErrorPayload,
} from "@/types/converter";

export async function probeFile(path: string): Promise<MediaInfo> {
  return invoke<MediaInfo>("probe_file", { path });
}

export async function startConversion(
  inputPath: string,
  settings: ConversionSettings,
  outputDir: string | null,
  outputFilename: string | null,
  durationSecs: number
): Promise<string> {
  return invoke<string>("start_conversion", {
    inputPath,
    settings,
    outputDir,
    outputFilename,
    durationSecs,
  });
}

export async function cancelConversion(jobId: string): Promise<void> {
  return invoke("cancel_conversion", { jobId });
}

export function onConvertProgress(cb: (p: ConvertProgressPayload) => void): Promise<UnlistenFn> {
  return listen<ConvertProgressPayload>("convert-progress", (e) => cb(e.payload));
}

export function onConvertComplete(cb: (p: ConvertCompletePayload) => void): Promise<UnlistenFn> {
  return listen<ConvertCompletePayload>("convert-complete", (e) => cb(e.payload));
}

export function onConvertError(cb: (p: ConvertErrorPayload) => void): Promise<UnlistenFn> {
  return listen<ConvertErrorPayload>("convert-error", (e) => cb(e.payload));
}
