import { useState, useEffect, useCallback, useRef } from "react";
import type { ConvertCard, ConversionSettings } from "@/types/converter";
import { defaultSettings } from "@/types/converter";
import * as api from "@/lib/converter-tauri";
import type { AppConfig } from "@/types";

export function useConverter(config: AppConfig) {
  const [cards, setCards] = useState<ConvertCard[]>([]);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  // Subscribe to converter events
  useEffect(() => {
    const unsubs: Promise<() => void>[] = [];

    unsubs.push(
      api.onConvertProgress(({ jobId, progress, speed }) => {
        setCards((prev) =>
          prev.map((c) => {
            if (c.jobId !== jobId) return c;
            return {
              ...c,
              progress: progress >= 0 ? progress : c.progress,
              speed: speed ?? c.speed,
            };
          })
        );
      })
    );

    unsubs.push(
      api.onConvertComplete(({ jobId, outputPath, outputFilename, outputSize }) => {
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
      api.onConvertError(({ jobId, error }) => {
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

      // Add card in probing state
      // Generate default output name (without extension, will be added by backend)
      const baseName = fileName.replace(/\.[^.]+$/, "");

      const card: ConvertCard = {
        id,
        filePath: path,
        fileName,
        customOutputName: baseName,
        mediaInfo: null,
        settings: defaultSettings(),
        status: "probing",
        jobId: null,
        progress: null,
        speed: null,
        outputPath: null,
        outputFilename: null,
        outputSize: null,
        error: null,
      };
      setCards((prev) => [...prev, card]);

      // Probe file
      try {
        const info = await api.probeFile(path);
        setCards((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: "ready" as const,
                  mediaInfo: info,
                  fileName: info.fileName,
                  settings: {
                    ...c.settings,
                    // Smart defaults based on probe
                    outputFormat: info.hasVideo ? "mp4" : "mp3",
                    videoCodec: info.hasVideo ? "h264" : "none",
                    audioCodec: info.hasAudio ? "aac" : "none",
                  },
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

  const updateSettings = useCallback((cardId: string, partial: Partial<ConversionSettings>) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, settings: { ...c.settings, ...partial } } : c
      )
    );
  }, []);

  const startConvert = useCallback(async (cardId: string) => {
    const card = cardsRef.current.find((c) => c.id === cardId);
    if (!card || !card.mediaInfo) return;

    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, status: "converting" as const, progress: 0, speed: null, error: null } : c
      )
    );

    try {
      // Use custom output name with the right extension
      const outputName = card.customOutputName
        ? `${card.customOutputName}.${card.settings.outputFormat}`
        : null;

      const jobId = await api.startConversion(
        card.filePath,
        card.settings,
        config.downloadPath,
        outputName,
        card.mediaInfo.durationSecs
      );
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, jobId } : c))
      );
    } catch (err) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, status: "error" as const, error: typeof err === "string" ? err : (err as Error).message || "Conversion failed" }
            : c
        )
      );
    }
  }, [config.downloadPath]);

  const cancelConvert = useCallback(async (cardId: string) => {
    const card = cardsRef.current.find((c) => c.id === cardId);
    if (card?.jobId) {
      await api.cancelConversion(card.jobId);
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

  const convertAll = useCallback(async () => {
    for (const card of cardsRef.current) {
      if (card.status === "ready") {
        await startConvert(card.id);
      }
    }
  }, [startConvert]);

  return {
    cards,
    addFiles,
    updateSettings,
    setOutputName,
    startConvert,
    cancelConvert,
    removeCard,
    convertAll,
  };
}
