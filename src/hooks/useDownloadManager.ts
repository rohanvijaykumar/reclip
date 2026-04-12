import { useState, useEffect, useCallback, useRef } from "react";
import type {
  CardData, FormatCategory, OutputFormat, AppConfig,
  DuplicateInfo, HistoryEntry, PlaylistHeaderData,
} from "@/types";
import { AUDIO_FORMATS } from "@/types";
import { parseUrls, looksLikePlaylist, isPermanentError, detectPlatformFromUrl } from "@/lib/utils";
import * as tauri from "@/lib/tauri";

const MAX_CONCURRENT = 10;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [3, 10, 30]; // seconds

function qualityToHeight(q: string): number | null {
  switch (q) {
    case "4k": return 2160;
    case "1080p": return 1080;
    case "720p": return 720;
    default: return null;
  }
}

function findDuplicate(history: HistoryEntry[], url: string): DuplicateInfo | null {
  const match = history.find((h) => h.url === url);
  if (!match) return null;
  const date = new Date(match.timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
  return { date, quality: match.quality, format: match.outputFormat };
}

export function useDownloadManager(config: AppConfig) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [category, setCategory] = useState<FormatCategory>("video");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("mp4");
  const [isFetching, setIsFetching] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistHeaderData[]>([]);
  const [allDoneFlash, setAllDoneFlash] = useState(false);

  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const configRef = useRef(config);
  configRef.current = config;
  const categoryRef = useRef(category);
  categoryRef.current = category;
  const outputFormatRef = useRef(outputFormat);
  outputFormatRef.current = outputFormat;

  // --- Queue advancement ---
  const advanceQueue = useCallback(() => {
    setCards((prev) => {
      const activeCount = prev.filter((c) => c.status === "downloading").length;
      if (activeCount >= MAX_CONCURRENT) return prev;

      const slotsAvailable = MAX_CONCURRENT - activeCount;
      let started = 0;
      const next = prev.map((c) => {
        if (started >= slotsAvailable) return c;
        if (c.status !== "queued") return c;
        started++;
        return { ...c, status: "downloading" as const, queuePosition: undefined, progress: 0 };
      });

      // Actually start the downloads for newly promoted cards
      if (started > 0) {
        next.forEach((c) => {
          if (c.status === "downloading" && !c.jobId && c.progress === 0) {
            fireDownload(c);
          }
        });
      }

      return started > 0 ? recomputeQueuePositions(next) : prev;
    });
  }, []);

  // Fire a download for a card (side effect, doesn't set state directly)
  const fireDownload = useCallback((card: CardData) => {
    const cat = categoryRef.current;
    const fmt = outputFormatRef.current;
    const resolvedOutputFormat = cat === "audio"
      ? (AUDIO_FORMATS.find((f) => f.id === fmt)?.ytdlpName ?? fmt)
      : fmt;
    const downloadTitle = card.customFilename?.trim() || card.title || "";
    const platform = detectPlatformFromUrl(card.url);

    tauri.startDownload(
      card.url,
      cat,
      card.selectedFormatId || null,
      downloadTitle,
      resolvedOutputFormat,
      card.thumbnail || null,
      platform,
      card.uploader || null,
    ).then((jobId) => {
      setCards((prev) =>
        prev.map((c) => c.url === card.url && c.status === "downloading" && !c.jobId
          ? { ...c, jobId }
          : c
        )
      );
    }).catch((err) => {
      const errorMsg = typeof err === "string" ? err : (err as Error).message || "Download failed";
      setCards((prev) =>
        prev.map((c) => c.url === card.url && c.status === "downloading" && !c.jobId
          ? { ...c, status: "error", error: errorMsg }
          : c
        )
      );
    });
  }, []);

  // --- Retry logic ---
  const scheduleRetry = useCallback((cardUrl: string, retryCount: number) => {
    const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
    let remaining = delay;

    // Set retrying state
    setCards((prev) =>
      prev.map((c) => c.url === cardUrl && (c.status === "error" || c.status === "retrying")
        ? { ...c, status: "retrying" as const, retryingIn: remaining, retryCount, error: undefined, jobId: undefined }
        : c
      )
    );

    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        // Move to queued and let queue system handle it
        setCards((prev) => {
          const updated = prev.map((c) =>
            c.url === cardUrl && c.status === "retrying"
              ? { ...c, status: "queued" as const, retryingIn: undefined, progress: null, speed: null, eta: null }
              : c
          );
          return recomputeQueuePositions(updated);
        });
        // Trigger queue advancement after state update
        setTimeout(() => advanceQueue(), 50);
      } else {
        setCards((prev) =>
          prev.map((c) => c.url === cardUrl && c.status === "retrying"
            ? { ...c, retryingIn: remaining }
            : c
          )
        );
      }
    }, 1000);
  }, [advanceQueue]);

  // When format category or output format changes, reset completed/error cards to "ready"
  useEffect(() => {
    setCards((prev) =>
      prev.map((c) =>
        c.status === "done" || c.status === "error"
          ? { ...c, status: "ready", progress: null, speed: null, eta: null, saved: false, savedName: undefined, error: undefined, jobId: undefined, retryCount: undefined, retryingIn: undefined }
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
              ? { ...c, status: "done", filename, saved: true, savedName: savedPath, retryCount: undefined, retryingIn: undefined }
              : c
          )
        );
        // Advance queue after a download completes
        setTimeout(() => advanceQueue(), 100);
      })
    );

    unsubs.push(
      tauri.onDownloadError(({ jobId, error }) => {
        setCards((prev) => {
          const updated = prev.map((c) => {
            if (c.jobId !== jobId) return c;
            const count = (c.retryCount ?? 0);
            // Check if we should auto-retry
            if (!isPermanentError(error) && count < MAX_RETRIES) {
              // Will be handled by scheduleRetry below
              return { ...c, status: "error" as const, error, jobId: undefined };
            }
            return { ...c, status: "error" as const, error };
          });
          return updated;
        });

        // Check if we need to schedule a retry
        setTimeout(() => {
          const current = cardsRef.current;
          const card = current.find((c) => c.jobId === jobId || (c.status === "error" && c.error === error));
          if (card && !isPermanentError(error) && (card.retryCount ?? 0) < MAX_RETRIES) {
            scheduleRetry(card.url, (card.retryCount ?? 0) + 1);
          } else {
            advanceQueue();
          }
        }, 50);
      })
    );

    return () => {
      unsubs.forEach((p) => p.then((fn) => fn()));
    };
  }, [advanceQueue, scheduleRetry]);

  // Check for "all done" state
  useEffect(() => {
    if (cards.length === 0) return;
    const hasActive = cards.some((c) =>
      c.status === "downloading" || c.status === "queued" || c.status === "retrying" || c.status === "loading"
    );
    const hasDone = cards.some((c) => c.status === "done");
    if (!hasActive && hasDone && !isFetching) {
      setAllDoneFlash(true);
      const timer = setTimeout(() => setAllDoneFlash(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [cards, isFetching]);

  const fetchUrls = useCallback(
    async (text: string) => {
      const urls = parseUrls(text);
      if (!urls.length) return;

      setIsFetching(true);
      setCards([]);
      setPlaylists([]);
      setAllDoneFlash(false);

      let history: HistoryEntry[] = [];
      try {
        history = await tauri.getHistory();
      } catch { /* ignore */ }

      const preferredHeight = qualityToHeight(configRef.current.defaultVideoQuality);

      // Separate playlist URLs from single video URLs
      const playlistUrls: string[] = [];
      const singleUrls: string[] = [];
      for (const url of urls) {
        if (looksLikePlaylist(url)) {
          playlistUrls.push(url);
        } else {
          singleUrls.push(url);
        }
      }

      // --- Handle playlists first (use flat data — no per-entry get_info) ---
      const allPlaylists: PlaylistHeaderData[] = [];
      const playlistCards: CardData[] = [];

      for (const url of playlistUrls) {
        try {
          const playlist = await tauri.getPlaylistInfo(url);
          const playlistId = `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const totalDuration = playlist.entries.reduce((sum, e) => sum + (e.duration ?? 0), 0);
          allPlaylists.push({
            id: playlistId,
            title: playlist.title,
            uploader: playlist.uploader,
            thumbnail: playlist.thumbnail,
            videoCount: playlist.entryCount,
            totalDuration,
          });

          // Use flat playlist data directly — no individual get_info needed
          for (const entry of playlist.entries) {
            const duplicateInfo = findDuplicate(history, entry.url);
            playlistCards.push({
              url: entry.url,
              status: "ready",
              title: entry.title || "",
              thumbnail: entry.thumbnail || "",
              duration: entry.duration,
              uploader: entry.uploader || "",
              formats: [],
              selectedFormatId: null,
              duplicateInfo,
              playlistId,
              checked: true,
            });
          }
        } catch (err) {
          const errMsg = typeof err === "string" ? err : (err as Error).message || "";
          if (errMsg === "NOT_A_PLAYLIST") {
            // It's actually a single video — add to single list
            singleUrls.push(url);
          } else {
            playlistCards.push({
              url,
              status: "info-error",
              error: errMsg || "Failed to load playlist",
            });
          }
        }
      }

      setPlaylists(allPlaylists);

      // --- Show all loading cards immediately, then fetch in parallel ---
      const loadingCards: CardData[] = singleUrls.map((url) => ({ url, status: "loading" as const }));
      setCards([...playlistCards, ...loadingCards]);

      // Fetch all single URLs in parallel (batch of up to 6 concurrent)
      const FETCH_CONCURRENCY = 6;
      const singleResults: CardData[] = new Array(singleUrls.length);

      const fetchOne = async (idx: number) => {
        const url = singleUrls[idx];
        try {
          const data = await tauri.getInfo(url);
          let defaultFormatId = data.formats?.[0]?.id || null;
          if (preferredHeight && data.formats) {
            const match = data.formats.find((f) => f.height === preferredHeight);
            if (match) defaultFormatId = match.id;
          }
          const duplicateInfo = findDuplicate(history, url);
          singleResults[idx] = {
            url,
            status: "ready",
            title: data.title || "",
            thumbnail: data.thumbnail || "",
            duration: data.duration,
            uploader: data.uploader || "",
            formats: data.formats || [],
            selectedFormatId: defaultFormatId,
            duplicateInfo,
          };
        } catch (err) {
          singleResults[idx] = {
            url,
            status: "info-error",
            error: typeof err === "string" ? err : (err as Error).message || "Unknown error",
          };
        }
        // Update the specific card as soon as its result arrives
        setCards((prev) => {
          const playlistCount = playlistCards.length;
          return prev.map((c, i) =>
            i === playlistCount + idx ? singleResults[idx] : c
          );
        });
      };

      // Run fetches in batches of FETCH_CONCURRENCY
      for (let i = 0; i < singleUrls.length; i += FETCH_CONCURRENCY) {
        const batch = [];
        for (let j = i; j < Math.min(i + FETCH_CONCURRENCY, singleUrls.length); j++) {
          batch.push(fetchOne(j));
        }
        await Promise.all(batch);
      }

      setIsFetching(false);
    },
    []
  );

  const downloadCard = useCallback(
    (index: number) => {
      setCards((prev) => {
        const c = prev[index];
        if (!c || c.status !== "ready") return prev;

        const activeCount = prev.filter((card) => card.status === "downloading").length;
        if (activeCount < MAX_CONCURRENT) {
          const updated = prev.map((card, i) =>
            i === index ? { ...card, status: "downloading" as const, error: undefined, progress: 0 } : card
          );
          // Fire the download
          fireDownload({ ...c, status: "downloading", progress: 0 });
          return updated;
        } else {
          // Queue it
          const updated = prev.map((card, i) =>
            i === index ? { ...card, status: "queued" as const, error: undefined } : card
          );
          return recomputeQueuePositions(updated);
        }
      });
    },
    [fireDownload]
  );

  const downloadAll = useCallback(() => {
    setCards((prev) => {
      const activeCount = prev.filter((c) => c.status === "downloading").length;
      let slotsUsed = 0;
      const toFire: CardData[] = [];

      const updated = prev.map((c) => {
        // For playlist items, only download checked ones
        if (c.playlistId && c.checked === false) return c;
        if (c.status !== "ready") return c;

        if (activeCount + slotsUsed < MAX_CONCURRENT) {
          slotsUsed++;
          const card = { ...c, status: "downloading" as const, error: undefined, progress: 0 };
          toFire.push(card);
          return card;
        }
        return { ...c, status: "queued" as const, error: undefined };
      });

      // Fire downloads for promoted cards
      toFire.forEach((c) => fireDownload(c));

      return recomputeQueuePositions(updated);
    });
  }, [fireDownload]);

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

  const dismissDuplicate = useCallback((index: number) => {
    setCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, duplicateInfo: null } : card
      )
    );
  }, []);

  const skipCard = useCallback((index: number) => {
    const card = cardsRef.current[index];
    if (card?.jobId) tauri.cleanupDownload(card.jobId).catch(() => {});
    setCards((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return recomputeQueuePositions(filtered);
    });
  }, []);

  // --- Queue reordering ---
  const moveInQueue = useCallback((fromIndex: number, toIndex: number) => {
    setCards((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return recomputeQueuePositions(arr);
    });
  }, []);

  const moveToTop = useCallback((index: number) => {
    setCards((prev) => {
      const card = prev[index];
      if (!card || card.status !== "queued") return prev;
      // Find the first queued card's position
      const firstQueuedIdx = prev.findIndex((c) => c.status === "queued");
      if (firstQueuedIdx === index) return prev;
      const arr = [...prev];
      const [moved] = arr.splice(index, 1);
      arr.splice(firstQueuedIdx, 0, moved);
      return recomputeQueuePositions(arr);
    });
  }, []);

  const downloadNext = useCallback((index: number) => {
    setCards((prev) => {
      const card = prev[index];
      if (!card || card.status !== "queued") return prev;
      // Find first position after all currently downloading cards
      const firstNonDownloading = prev.findIndex((c) => c.status !== "downloading");
      const target = firstNonDownloading >= 0 ? firstNonDownloading : 0;
      if (target === index) return prev;
      const arr = [...prev];
      const [moved] = arr.splice(index, 1);
      arr.splice(target, 0, moved);
      return recomputeQueuePositions(arr);
    });
  }, []);

  // --- Playlist controls ---
  const toggleCheck = useCallback((index: number) => {
    setCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, checked: !card.checked } : card
      )
    );
  }, []);

  const toggleAllPlaylist = useCallback((playlistId: string, checked: boolean) => {
    setCards((prev) =>
      prev.map((c) =>
        c.playlistId === playlistId && (c.status === "ready" || c.status === "queued")
          ? { ...c, checked }
          : c
      )
    );
  }, []);

  const setAllPlaylistQuality = useCallback((playlistId: string, formatId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.playlistId === playlistId ? { ...c, selectedFormatId: formatId } : c
      )
    );
  }, []);

  // --- Context menu actions ---
  const copyUrl = useCallback((index: number) => {
    const card = cardsRef.current[index];
    if (card) navigator.clipboard.writeText(card.url);
  }, []);

  const removeCard = useCallback((index: number) => {
    const card = cardsRef.current[index];
    if (card?.jobId) tauri.cleanupDownload(card.jobId).catch(() => {});
    setCards((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return recomputeQueuePositions(filtered);
    });
  }, []);

  const retryFailed = useCallback(() => {
    setCards((prev) => {
      const activeCount = prev.filter((c) => c.status === "downloading").length;
      let slotsUsed = 0;
      const toFire: CardData[] = [];

      const updated = prev.map((c) => {
        if (c.status !== "error") return c;
        if (activeCount + slotsUsed < MAX_CONCURRENT) {
          slotsUsed++;
          const card = { ...c, status: "downloading" as const, error: undefined, progress: 0, jobId: undefined, retryCount: undefined };
          toFire.push(card);
          return card;
        }
        return { ...c, status: "queued" as const, error: undefined, jobId: undefined, retryCount: undefined };
      });

      toFire.forEach((c) => fireDownload(c));
      return recomputeQueuePositions(updated);
    });
  }, [fireDownload]);

  // Compute summary stats
  const readyCount = cards.filter((c) => {
    if (c.playlistId && c.checked === false) return false;
    return c.status === "ready";
  }).length;
  const queuedCount = cards.filter((c) => c.status === "queued").length;
  const downloadingCount = cards.filter((c) => c.status === "downloading").length;
  const doneCount = cards.filter((c) => c.status === "done").length;
  const errorCount = cards.filter((c) => c.status === "error").length;

  return {
    cards,
    category,
    setCategory,
    outputFormat,
    setOutputFormat,
    isFetching,
    playlists,
    allDoneFlash,
    // Counts
    readyCount,
    queuedCount,
    downloadingCount,
    doneCount,
    errorCount,
    // Actions
    fetchUrls,
    downloadCard,
    downloadAll,
    pickFormat,
    setCustomFilename,
    dismissDuplicate,
    skipCard,
    // Queue
    moveInQueue,
    moveToTop,
    downloadNext,
    // Playlist
    toggleCheck,
    toggleAllPlaylist,
    setAllPlaylistQuality,
    // Context menu
    copyUrl,
    removeCard,
    retryFailed,
  };
}

function recomputeQueuePositions(cards: CardData[]): CardData[] {
  let pos = 1;
  return cards.map((c) => {
    if (c.status === "queued") {
      return { ...c, queuePosition: pos++ };
    }
    return { ...c, queuePosition: undefined };
  });
}
