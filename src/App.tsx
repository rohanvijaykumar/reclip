import { useState, useCallback } from "react";
import { Settings as SettingsIcon, Clock, FolderOpen, Download, ArrowLeftRight, Copy, Trash2, ArrowUpToLine, ArrowUp, X as XIcon, FolderOpen as FolderIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useConfig } from "@/contexts/ConfigContext";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { useClipboardWatcher } from "@/hooks/useClipboardWatcher";
import { InputArea } from "@/components/InputArea";
import { VideoCard } from "@/components/VideoCard";
import { DownloadAllBar } from "@/components/DownloadAllBar";
import { ClipboardToast } from "@/components/ClipboardToast";
import { ContextMenu } from "@/components/ContextMenu";
import { PlaylistHeader } from "@/components/PlaylistHeader";
import { SettingsView } from "@/components/SettingsView";
import { HistoryView } from "@/components/HistoryView";
import { EmptyState } from "@/components/EmptyState";
import { ConverterView } from "@/components/converter/ConverterView";
import { VIDEO_FORMATS, AUDIO_FORMATS } from "@/types";
import type { ContextMenuItem } from "@/types";
import * as tauri from "@/lib/tauri";

type ViewState = "main" | "settings" | "history";
type Tab = "download" | "convert";

interface ContextMenuState {
  x: number;
  y: number;
  cardIndex: number;
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>("main");
  const [activeTab, setActiveTab] = useState<Tab>("download");
  const [urls, setUrls] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const { config, isLoaded } = useConfig();

  const dm = useDownloadManager(config);
  const {
    cards, category, setCategory, outputFormat, setOutputFormat,
    isFetching, playlists, allDoneFlash,
    readyCount, queuedCount, downloadingCount, doneCount, errorCount,
    fetchUrls, downloadCard, downloadAll, pickFormat, setCustomFilename,
    dismissDuplicate, skipCard, moveInQueue, moveToTop, downloadNext,
    toggleCheck, toggleAllPlaylist, setAllPlaylistQuality,
    copyUrl, removeCard, retryFailed,
  } = dm;

  const { detection, dismiss: dismissToast, grab: grabUrl } = useClipboardWatcher(
    config.clipboardWatchEnabled,
    urls
  );

  const handleGrab = useCallback(() => {
    const url = grabUrl();
    if (url) {
      setUrls(url);
      setActiveTab("download");
      setCurrentView("main");
      setTimeout(() => fetchUrls(url), 50);
    }
  }, [grabUrl, fetchUrls]);

  const formats = category === "video" ? VIDEO_FORMATS : AUDIO_FORMATS;
  const formatLabel = formats.find((f) => f.id === outputFormat)?.label ?? outputFormat.toUpperCase();
  const formatDisplay = `${formatLabel} ${category === "video" ? "Video" : "Audio"}`;

  const handleFetch = useCallback(() => {
    if (!urls.trim() || isFetching) return;
    fetchUrls(urls);
  }, [urls, isFetching, fetchUrls]);

  const handleRedownload = useCallback((url: string) => {
    setUrls(url);
    setActiveTab("download");
    setCurrentView("main");
    setTimeout(() => fetchUrls(url), 100);
  }, [fetchUrls]);

  // --- Context menu ---
  const handleCardContextMenu = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, cardIndex: index });
  }, []);

  const getContextMenuItems = useCallback((index: number): ContextMenuItem[] => {
    const card = cards[index];
    if (!card) return [];
    const items: ContextMenuItem[] = [];

    if (card.status === "ready") {
      items.push({ label: "Download", icon: <Download size={14} />, action: () => downloadCard(index) });
    }
    if (card.status === "queued") {
      items.push({ label: "Download next", icon: <ArrowUp size={14} />, action: () => downloadNext(index) });
      items.push({ label: "Move to top", icon: <ArrowUpToLine size={14} />, action: () => moveToTop(index) });
    }
    if (card.status === "downloading" || card.status === "queued") {
      items.push({ label: "Cancel", icon: <XIcon size={14} />, action: () => removeCard(index), danger: true });
    }
    if (items.length > 0) {
      items.push({ label: "", action: () => {}, separator: true });
    }
    items.push({ label: "Copy URL", icon: <Copy size={14} />, action: () => copyUrl(index) });
    if (card.status === "done") {
      items.push({ label: "Open folder", icon: <FolderIcon size={14} />, action: () => tauri.openDownloadFolder() });
    }
    items.push({ label: "", action: () => {}, separator: true });
    items.push({ label: "Remove", icon: <Trash2 size={14} />, action: () => removeCard(index), danger: true });

    return items;
  }, [cards, downloadCard, downloadNext, moveToTop, removeCard, copyUrl]);

  // --- Drag reorder for queued ---
  const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((targetIndex: number) => {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      moveInQueue(dragIndex, targetIndex);
    }
    setDragIndex(null);
  }, [dragIndex, moveInQueue]);

  // Bulk quality set for non-playlist cards
  const setAllQuality = useCallback((formatId: string) => {
    cards.forEach((c, i) => {
      if (c.status === "ready" && !c.playlistId) {
        // For video: find the format matching this height
        if (category === "video" && c.formats) {
          const height = parseInt(formatId);
          const match = c.formats.find((f) => f.height === height);
          if (match) pickFormat(i, match.id);
        } else {
          pickFormat(i, formatId);
        }
      }
    });
  }, [cards, category, pickFormat]);

  // Show download all bar?
  const showBar = readyCount >= 2 || downloadingCount > 0 || queuedCount > 0 || allDoneFlash || (errorCount > 0 && doneCount > 0);

  if (!isLoaded) {
    return <div className="h-screen bg-base" />;
  }

  if (currentView === "settings") {
    return (
      <div className="h-screen flex flex-col bg-base bg-noise overflow-hidden">
        <SettingsView onBack={() => setCurrentView("main")} />
        {detection && (
          <ClipboardToast detection={detection} onGrab={handleGrab} onDismiss={dismissToast} />
        )}
      </div>
    );
  }

  if (currentView === "history") {
    return (
      <div className="h-screen flex flex-col bg-base bg-noise overflow-hidden">
        <HistoryView onBack={() => setCurrentView("main")} onRedownload={handleRedownload} />
        {detection && (
          <ClipboardToast detection={detection} onGrab={handleGrab} onDismiss={dismissToast} />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-base bg-noise overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 shrink-0 flex justify-between items-start">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight text-primary mb-1">ReClip</h1>
          <p className="text-sm text-secondary">The cleanest way to save media locally.</p>
          {/* Tab Bar */}
          <div className="flex glass-card rounded-lg p-1 mt-3 w-fit">
            <button
              onClick={() => setActiveTab("download")}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                activeTab === "download"
                  ? "bg-hover text-primary shadow-sm"
                  : "text-tertiary hover:text-secondary"
              )}
            >
              <Download size={14} /> Download
            </button>
            <button
              onClick={() => setActiveTab("convert")}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                activeTab === "convert"
                  ? "bg-hover text-primary shadow-sm"
                  : "text-tertiary hover:text-secondary"
              )}
            >
              <ArrowLeftRight size={14} /> Convert
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentView("history")}
            className="p-2 rounded-lg hover:bg-hover text-secondary hover:text-primary transition-all border border-transparent hover:border-subtle"
            title="Download History"
          >
            <Clock size={20} strokeWidth={2} />
          </button>
          <button
            onClick={() => setCurrentView("settings")}
            className="p-2 rounded-lg hover:bg-hover text-secondary hover:text-primary transition-all border border-transparent hover:border-subtle"
            title="Settings"
          >
            <SettingsIcon size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto relative pb-20">
        <div className="px-6">
          {activeTab === "download" ? (
            <>
              <InputArea
                urls={urls}
                onUrlsChange={setUrls}
                category={category}
                outputFormat={outputFormat}
                onCategoryChange={setCategory}
                onOutputFormatChange={setOutputFormat}
                onFetch={handleFetch}
                isFetching={isFetching}
              />

              {cards.length === 0 && playlists.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  {/* Playlist headers */}
                  {playlists.map((pl) => (
                    <PlaylistHeader
                      key={pl.id}
                      data={pl}
                      cards={cards}
                      category={category}
                      onToggleAll={(checked) => toggleAllPlaylist(pl.id, checked)}
                      onSetAllQuality={(fid) => {
                        // For video: find the format at this height for each card
                        if (category === "video") {
                          const height = parseInt(fid);
                          cards.forEach((c, i) => {
                            if (c.playlistId === pl.id && c.formats) {
                              const match = c.formats.find((f) => f.height === height);
                              if (match) pickFormat(i, match.id);
                            }
                          });
                        } else {
                          setAllPlaylistQuality(pl.id, fid);
                        }
                      }}
                    />
                  ))}

                  {/* Cards */}
                  <div className="flex flex-col gap-4">
                    {cards.map((card, idx) => (
                      <VideoCard
                        key={`${card.url}-${idx}`}
                        data={card}
                        index={idx}
                        formatLabel={formatDisplay}
                        category={category}
                        onDownload={() => downloadCard(idx)}
                        onPickFormat={(fid) => pickFormat(idx, fid)}
                        onRename={(name) => setCustomFilename(idx, name)}
                        onDismissDuplicate={() => dismissDuplicate(idx)}
                        onSkip={() => skipCard(idx)}
                        onContextMenu={(e) => handleCardContextMenu(idx, e)}
                        onToggleCheck={() => toggleCheck(idx)}
                        draggable={card.status === "queued"}
                        onDragStart={(e) => handleDragStart(idx, e)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(idx)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <ConverterView />
          )}
        </div>
      </div>

      {/* Bottom bar (download tab only) */}
      {activeTab === "download" && (
        <div className="absolute bottom-0 left-0 right-0 z-30">
          <div className="px-6 pb-4 flex justify-between items-center">
            <button
              onClick={() => tauri.openDownloadFolder()}
              className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-tertiary hover:text-primary rounded-lg hover:bg-hover/50 transition-all"
            >
              <FolderOpen size={14} />
              {config.downloadPath
                ? config.downloadPath.split(/[/\\]/).pop()
                : "Downloads"}
            </button>
          </div>

          {showBar && (
            <div className="px-6 pb-6">
              <DownloadAllBar
                cards={cards}
                category={category}
                readyCount={readyCount}
                downloadingCount={downloadingCount}
                queuedCount={queuedCount}
                doneCount={doneCount}
                errorCount={errorCount}
                allDoneFlash={allDoneFlash}
                onDownloadAll={downloadAll}
                onRetryFailed={retryFailed}
                onSetAllQuality={setAllQuality}
              />
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.cardIndex)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Clipboard toast */}
      {detection && (
        <ClipboardToast detection={detection} onGrab={handleGrab} onDismiss={dismissToast} />
      )}
    </div>
  );
}
