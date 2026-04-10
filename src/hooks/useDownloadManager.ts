import { useState, useEffect, useCallback, useRef } from "react";
import type { CardData, FormatCategory, OutputFormat, AppConfig } from "@/types";
import { AUDIO_FORMATS } from "@/types";
import { parseUrls } from "@/lib/utils";
import * as tauri from "@/lib/tauri";

function qualityToHeight(q: string): number | null {
  switch (q) {
    case "4k": return 2160;
    case "1080p": return 1080;
    case "720p": return 720;
    default: return null; // "best" → use first format
  }
}

export function useDownloadManager(config: AppConfig) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [category, setCategory] = useState<FormatCategory>("video");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("mp4");
  const [isFetching, setIsFetching] = useState(false);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const configRef = useRef(config);
  configRef.current = config;

  // When format category or output format changes, reset completed/error cards to "ready"
  useEffect(() => {
    setCards((prev) =>
      prev.map((c) =>
        c.status === "done" || c.status === "error"
          ? { ...c, status: "ready", progress: null, speed: null, eta: null, saved: false, savedName: undefined, error: undefined, jobId: undefined }
          : c
      )
    );
  }, [category, outputFormat]);

  // Subscribe to Tauri download events
  useEffect(() => {
    const unsubs: Promise<() => void>[] = [];

    unsubs.push(
      tauri.onDownloadProgress(({ jobId, progress, speed, eta }) => {
        setCards((prev) =>
          prev.map((c) => (c.jobId === jobId ? { ...c, progress, speed, eta } : c))
        );
      })
    );

    unsubs.push(
      tauri.onDownloadComplete(({ jobId, filename, savedPath }) => {
        setCards((prev) =>
          prev.map((c) =>
            c.jobId === jobId
              ? { ...c, status: "done", filename, saved: true, savedName: savedPath }
              : c
          )
        );
        // Notifications are now handled natively in Rust
      })
    );

    unsubs.push(
      tauri.onDownloadError(({ jobId, error }) => {
        setCards((prev) =>
          prev.map((c) =>
            c.jobId === jobId ? { ...c, status: "error", error } : c
          )
        );
      })
    );

    return () => {
      unsubs.forEach((p) => p.then((fn) => fn()));
    };
  }, []);

  const fetchUrls = useCallback(
    async (text: string) => {
      const urls = parseUrls(text);
      if (!urls.length) return;

      setIsFetching(true);
      setCards([]);

      const newCards: CardData[] = [];
      const preferredHeight = qualityToHeight(configRef.current.defaultVideoQuality);

      for (const url of urls) {
        const idx = newCards.length;
        newCards.push({ url, status: "loading" });
        setCards([...newCards]);

        try {
          const data = await tauri.getInfo(url);

          // Pre-select format based on user's default quality preference
          let defaultFormatId = data.formats?.[0]?.id || null;
          if (preferredHeight && data.formats) {
            const match = data.formats.find((f) => f.height === preferredHeight);
            if (match) defaultFormatId = match.id;
          }

          newCards[idx] = {
            ...newCards[idx],
            status: "ready",
            title: data.title || "",
            thumbnail: data.thumbnail || "",
            duration: data.duration,
            uploader: data.uploader || "",
            formats: data.formats || [],
            selectedFormatId: defaultFormatId,
          };
        } catch (err) {
          newCards[idx] = {
            ...newCards[idx],
            status: "info-error",
            error: typeof err === "string" ? err : (err as Error).message || "Unknown error",
          };
        }
        setCards([...newCards]);
      }

      setIsFetching(false);
    },
    []
  );

  const downloadCard = useCallback(
    async (index: number) => {
      const c = cardsRef.current[index];
      if (!c) return;

      setCards((prev) =>
        prev.map((card, i) =>
          i === index ? { ...card, status: "downloading", error: undefined, progress: 0 } : card
        )
      );

      try {
        const resolvedOutputFormat = category === "audio"
          ? (AUDIO_FORMATS.find((f) => f.id === outputFormat)?.ytdlpName ?? outputFormat)
          : outputFormat;

        // Use customFilename if set, otherwise fall back to title
        const downloadTitle = c.customFilename?.trim() || c.title || "";
        const jobId = await tauri.startDownload(
          c.url,
          category,
          c.selectedFormatId || null,
          downloadTitle,
          resolvedOutputFormat,
          c.thumbnail || null
        );
        setCards((prev) =>
          prev.map((card, i) => (i === index ? { ...card, jobId } : card))
        );
      } catch (err) {
        setCards((prev) =>
          prev.map((card, i) =>
            i === index
              ? { ...card, status: "error", error: typeof err === "string" ? err : (err as Error).message || "Download failed" }
              : card
          )
        );
      }
    },
    [category, outputFormat]
  );

  const downloadAll = useCallback(async () => {
    for (let i = 0; i < cardsRef.current.length; i++) {
      if (cardsRef.current[i].status === "ready") {
        await downloadCard(i);
      }
    }
  }, [downloadCard]);

  const pickFormat = useCallback((index: number, formatId: string) => {
    setCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, selectedFormatId: formatId } : card
      )
    );
  }, []);

  const setCustomFilename = useCallback((index: number, name: string) => {
    setCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, customFilename: name } : card
      )
    );
  }, []);

  return {
    cards,
    category,
    setCategory,
    outputFormat,
    setOutputFormat,
    isFetching,
    fetchUrls,
    downloadCard,
    downloadAll,
    pickFormat,
    setCustomFilename,
  };
}
