import { useState, useCallback } from "react";
import { Settings as SettingsIcon, Clock, FolderOpen, Download, ArrowLeftRight, Minimize2, Copy, Trash2, ArrowUpToLine, ArrowUp, X as XIcon, FolderOpen as FolderIcon } from "lucide-react";
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
import { MacOSSidebar, type SidebarItem } from "@/components/ui/macos-sidebar";
import { EmptyState } from "@/components/EmptyState";
import { ConverterView } from "@/components/converter/ConverterView";
import { CompressorView } from "@/components/compressor/CompressorView";
import { VIDEO_FORMATS, AUDIO_FORMATS } from "@/types";
import type { ContextMenuItem } from "@/types";
import * as tauri from "@/lib/tauri";

type UnifiedView = "download" | "convert" | "compress" | "history" | "settings";

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "download", label: "Download", icon: <Download size={18} />, color: "var(--accent-download)" },
  { id: "convert", label: "Convert", icon: <ArrowLeftRight size={18} />, color: "var(--accent-convert)" },
  { id: "compress", label: "Compress", icon: <Minimize2 size={18} />, color: "var(--accent-compress)" },
  { id: "sep1", label: "", isSeparator: true },
  { id: "history", label: "History", icon: <FolderIcon size={18} />, color: "var(--accent-history)" },
  { id: "settings", label: "Settings", icon: <SettingsIcon size={18} />, color: "var(--accent-settings)" },
];

interface ContextMenuState {
  x: number;
  y: number;
  cardIndex: number;
}

export default function App() {
  const [activeView, setActiveView] = useState<UnifiedView>("download");
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
      setActiveView("download");
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
    setActiveView("download");
    setTimeout(() => fetchUrls(url), 100);
  }, [fetchUrls]);

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

  const setAllQuality = useCallback((formatId: string) => {
    cards.forEach((c, i) => {
      if (c.status === "ready" && !c.playlistId) {
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

  const showBar = readyCount >= 2 || downloadingCount > 0 || queuedCount > 0 || allDoneFlash || (errorCount > 0 && doneCount > 0);

  if (!isLoaded) {
    return <div className="h-screen bg-base" />;
  }

  const getSidebarItem = () => SIDEBAR_ITEMS.find(s => s.id === activeView);

  return (
    <div 
      className="h-screen flex bg-base overflow-hidden transition-colors duration-500"
      style={{ "--theme-accent": getSidebarItem()?.color || "var(--theme-primary)" } as React.CSSProperties}
    >
      <div className="absolute inset-0 z-0 bg-noise opacity-50 pointer-events-none" />
      <MacOSSidebar
        items={SIDEBAR_ITEMS}
        activeId={activeView}
        onSelect={(item) => setActiveView(item.id as UnifiedView)}
        defaultOpen={true}
        className="z-50"
      >
        <div className="flex-1 h-full flex flex-col bg-raised/30 backdrop-blur-3xl sm:rounded-l-3xl border-l border-subtle overflow-hidden relative shadow-2xl">
          {/* Dynamic mode background tint */}
          <div 
            className="absolute inset-0 z-0 opacity-[0.03] transition-colors duration-500 pointer-events-none mix-blend-screen"
            style={{ backgroundColor: "var(--theme-accent)" }}
          />

          <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar h-full">
            {activeView === "settings" && <SettingsView onBack={() => setActiveView("download")} />}
            {activeView === "history" && <HistoryView onBack={() => setActiveView("download")} onRedownload={handleRedownload} />}
            
            {/* Toolkit Views */}
            <div className={cn("h-full flex flex-col", activeView !== "download" && "hidden")}>
              <header className="px-8 py-8 shrink-0 relative z-20">
                <h1 className="font-semibold text-3xl tracking-tight text-primary mb-1.5">Download Media</h1>
                <p className="text-[15px] text-tertiary">The cleanest way to save media locally.</p>
              </header>
              <div className="px-8 flex-1 pb-32">
                <div className="max-w-4xl mx-auto space-y-8">
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
                          {playlists.map((pl) => (
                            <PlaylistHeader
                              key={pl.id}
                              data={pl}
                              cards={cards}
                              category={category}
                              onToggleAll={(checked) => toggleAllPlaylist(pl.id, checked)}
                              onSetAllQuality={(fid) => {
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
                    </div>
                  </div>

                {/* Bottom bar for Download View */}
                <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
                  <div className="px-8 pb-6 flex justify-between items-center pointer-events-auto">
                    <button
                      onClick={() => tauri.openDownloadFolder()}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-tertiary hover:text-primary rounded-lg hover:bg-hover/50 transition-all glass-card"
                    >
                      <FolderOpen size={14} />
                      {config.downloadPath
                        ? config.downloadPath.split(/[/\\]/).pop()
                        : "Downloads"}
                    </button>
                  </div>
                  {showBar && (
                    <div className="px-8 pb-8 pointer-events-auto">
                      <DownloadAllBar
                        cards={cards}
                        category={category}
                        readyCount={readyCount}
                        queuedCount={queuedCount}
                        downloadingCount={downloadingCount}
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
              </div>

                {/* Convert View */}
                <div className={cn("h-full flex flex-col", activeView !== "convert" && "hidden")}>
                  <header className="px-8 py-8 shrink-0 relative z-20">
                    <h1 className="font-semibold text-3xl tracking-tight text-primary mb-1.5">Converter</h1>
                    <p className="text-[15px] text-tertiary">Lossless format conversion engine.</p>
                  </header>
                  <div className="px-8 flex-1 pb-24 overflow-y-auto">
                    <div className="max-w-4xl mx-auto">
                      <ConverterView isActive={activeView === "convert"} />
                    </div>
                  </div>
                </div>

                {/* Compress View */}
                <div className={cn("h-full flex flex-col", activeView !== "compress" && "hidden")}>
                  <header className="px-8 py-8 shrink-0 relative z-20">
                    <h1 className="font-semibold text-3xl tracking-tight text-primary mb-1.5">Compressor</h1>
                    <p className="text-[15px] text-tertiary">Smart media size reduction.</p>
                  </header>
                  <div className="px-8 flex-1 pb-24 overflow-y-auto">
                    <div className="max-w-4xl mx-auto">
                      <CompressorView isActive={activeView === "compress"} />
                    </div>
                  </div>
                </div>
              </main>

          {contextMenu && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              items={getContextMenuItems(contextMenu.cardIndex)}
              onClose={() => setContextMenu(null)}
            />
          )}

          {detection && <ClipboardToast detection={detection} onGrab={handleGrab} onDismiss={dismissToast} />}
        </div>
      </MacOSSidebar>
    </div>
  );
}
