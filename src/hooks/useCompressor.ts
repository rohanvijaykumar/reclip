import { useState, useEffect, useCallback, useRef } from "react";
import type { CompressCard, CompressionSettings } from "@/types/compressor";
import { defaultVideoSettings, defaultAudioSettings } from "@/types/compressor";
import * as api from "@/lib/compressor-tauri";
import type { AppConfig } from "@/types";

export function useCompressor(config: AppConfig) {
  const [cards, setCards] = useState<CompressCard[]>([]);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  // Subscribe to compressor events
  useEffect(() => {
    const unsubs: Promise<() => void>[] = [];

    unsubs.push(
      api.onCompressProgress(({ jobId, progress, speed, pass, totalPasses }) => {
        setCards((prev) =>
          prev.map((c) => {
            if (c.jobId !== jobId) return c;
            return {
              ...c,
              progress: progress >= 0 ? progress : c.progress,
              speed: speed ?? c.speed,
              currentPass: pass ?? c.currentPass,
              totalPasses: totalPasses ?? c.totalPasses,
            };
          })
        );
      })
    );

    unsubs.push(
      api.onCompressComplete(({ jobId, outputPath, outputFilename, outputSize }) => {
        setCards((prev) =>
          prev.map((c) =>
            c.jobId === jobId
              ? { ...c, status: "done" as const, outputPath, outputFilename, outputSize, progress: 100 }
              : c
          )
        );
      })
    );

    unsubs.push(
      api.onCompressError(({ jobId, error }) => {
        console.error("[compress] ffmpeg error:", jobId, error);
        setCards((prev) =>
          prev.map((c) =>
            c.jobId === jobId
              ? { ...c, status: "error" as const, error }
              : c
          )
        );
      })
    );

    return () => {
      unsubs.forEach((p) => p.then((fn) => fn()));
    };
  }, []);

  const addFiles = useCallback(async (paths: string[]) => {
    for (const path of paths) {
      const id = crypto.randomUUID().slice(0, 10);
      const fileName = path.split(/[/\\]/).pop() || "unknown";
      const baseName = fileName.replace(/\.[^.]+$/, "");

      const card: CompressCard = {
        id,
        filePath: path,
        fileName,
        customOutputName: baseName,
        mediaInfo: null,
        settings: defaultVideoSettings(), // placeholder until probe
        status: "probing",
        jobId: null,
        progress: null,
        speed: null,
        currentPass: null,
        totalPasses: null,
        outputPath: null,
        outputFilename: null,
        outputSize: null,
        error: null,
      };
      setCards((prev) => [...prev, card]);

      try {
        const info = await api.probeFile(path);
        const isAudioOnly = !info.hasVideo;

        // Pick appropriate defaults based on media type
        const baseSettings = isAudioOnly ? defaultAudioSettings() : defaultVideoSettings();

        // For video files, try to match the input container
        let outputFormat = baseSettings.outputFormat;
        if (!isAudioOnly && info.containerFormat) {
          const fmt = info.containerFormat.toLowerCase();
          if (fmt.includes("mp4") || fmt.includes("mov") || fmt.includes("m4a")) outputFormat = "mp4";
          else if (fmt.includes("matroska") || fmt.includes("mkv")) outputFormat = "mkv";
          else if (fmt.includes("webm")) outputFormat = "webm";
          else outputFormat = "mp4";
        }
        // For audio files, match input format where possible
        if (isAudioOnly && info.containerFormat) {
          const fmt = info.containerFormat.toLowerCase();
          if (fmt.includes("mp3") || fmt.includes("mpeg")) outputFormat = "mp3";
          else if (fmt.includes("flac")) outputFormat = "flac";
          else if (fmt.includes("wav") || fmt.includes("pcm")) outputFormat = "mp3"; // compress wav to mp3 by default
          else if (fmt.includes("ogg")) outputFormat = "ogg";
          else if (fmt.includes("opus")) outputFormat = "opus";
          else outputFormat = "mp3";
        }

        setCards((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: "ready" as const,
                  mediaInfo: info,
                  fileName: info.fileName,
                  settings: { ...baseSettings, outputFormat },
                }
              : c
          )
        );
      } catch (err) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, status: "error" as const, error: typeof err === "string" ? err : (err as Error).message || "Failed to probe file" }
              : c
          )
        );
      }
    }
  }, []);

  const updateSettings = useCallback((cardId: string, partial: Partial<CompressionSettings>) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, settings: { ...c.settings, ...partial } } : c
      )
    );
  }, []);

  const startCompress = useCallback(async (cardId: string) => {
    const card = cardsRef.current.find((c) => c.id === cardId);
    if (!card || !card.mediaInfo) return;

    const isTwoPass = card.settings.targetSizeMb != null;

    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              status: "compressing" as const,
              progress: 0,
              speed: null,
              error: null,
              currentPass: isTwoPass ? 1 : null,
              totalPasses: isTwoPass ? 2 : null,
            }
          : c
      )
    );

    try {
      const outputName = card.customOutputName
        ? `${card.customOutputName}.${card.settings.outputFormat}`
        : null;

      console.log("[compress] starting compression:", {
        filePath: card.filePath,
        settings: card.settings,
        outputDir: config.downloadPath,
        outputName,
        durationSecs: card.mediaInfo.durationSecs,
      });

      const jobId = await api.startCompression(
        card.filePath,
        card.settings,
        config.downloadPath,
        outputName,
        card.mediaInfo.durationSecs
      );
      console.log("[compress] job started:", jobId);
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, jobId } : c))
      );
    } catch (err) {
      const errorMsg = typeof err === "string" ? err : (err as Error).message || "Compression failed";
      console.error("[compress] invoke failed:", err);
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, status: "error" as const, error: errorMsg }
            : c
        )
      );
    }
  }, [config.downloadPath]);

  const cancelCompress = useCallback(async (cardId: string) => {
    const card = cardsRef.current.find((c) => c.id === cardId);
    if (card?.jobId) {
      await api.cancelCompression(card.jobId);
    }
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, status: "cancelled" as const } : c
      )
    );
  }, []);

  const removeCard = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  }, []);

  const setOutputName = useCallback((cardId: string, name: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, customOutputName: name } : c))
    );
  }, []);

  const compressAll = useCallback(async () => {
    for (const card of cardsRef.current) {
      if (card.status === "ready") {
        await startCompress(card.id);
      }
    }
  }, [startCompress]);

  return {
    cards,
    addFiles,
    updateSettings,
    setOutputName,
    startCompress,
    cancelCompress,
    removeCard,
    compressAll,
  };
}
