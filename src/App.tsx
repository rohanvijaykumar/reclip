import { useState, useCallback } from "react";
import { Settings as SettingsIcon, Download, ArrowLeftRight, Minimize2, FolderOpen as FolderIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useConfig } from "@/contexts/ConfigContext";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { useClipboardWatcher } from "@/hooks/useClipboardWatcher";
import { TitleBar } from "@/components/TitleBar";
import { InputArea } from "@/components/InputArea";
import { VideoCard } from "@/components/VideoCard";
import { DownloadAllBar } from "@/components/DownloadAllBar";
import { ClipboardToast } from "@/components/ClipboardToast";
import { PlaylistHeader } from "@/components/PlaylistHeader";
import { SettingsView } from "@/components/SettingsView";
import { HistoryView } from "@/components/HistoryView";
import { MacOSSidebar, type SidebarItem } from "@/components/ui/macos-sidebar";
import { EmptyState } from "@/components/EmptyState";
import { ConverterView } from "@/components/converter/ConverterView";
import { CompressorView } from "@/components/compressor/CompressorView";
import { VIDEO_FORMATS, AUDIO_FORMATS } from "@/types";

type UnifiedView = "download" | "convert" | "compress" | "history" | "settings";

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "download", label: "Download", icon: <Download size={18} />, color: "var(--accent-download)" },
  { id: "convert", label: "Convert", icon: <ArrowLeftRight size={18} />, color: "var(--accent-convert)" },
  { id: "compress", label: "Compress", icon: <Minimize2 size={18} />, color: "var(--accent-compress)" },
  { id: "sep1", label: "", isSeparator: true },
  { id: "history", label: "History", icon: <FolderIcon size={18} />, color: "var(--accent-history)" },
  { id: "settings", label: "Settings", icon: <SettingsIcon size={18} />, color: "var(--accent-settings)" },
];

export default function App() {
  const [activeView, setActiveView] = useState<UnifiedView>("download");
  const [urls, setUrls] = useState("");
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

  if (!isLoaded) {
    return <div className="h-screen bg-base" />;
  }

  const getSidebarItem = () => SIDEBAR_ITEMS.find(s => s.id === activeView);

  return (
    <div
      className="h-screen flex bg-base overflow-hidden transition-colors duration-500 relative"
      style={{ "--theme-accent": getSidebarItem()?.color || "var(--theme-primary)" } as React.CSSProperties}
    >
      <TitleBar />
      <div className="absolute inset-0 z-0 bg-noise opacity-50 pointer-events-none" />
      <MacOSSidebar
          items={SIDEBAR_ITEMS}
          activeId={activeView}
          onSelect={(item) => setActiveView(item.id as UnifiedView)}
          defaultOpen={true}
          className="z-50"
        >
          <div className="flex-1 h-full flex flex-col bg-raised/30 backdrop-blur-3xl overflow-hidden relative pt-9">
            {/* Dynamic mode background tint */}
            <div
              className="absolute inset-0 z-0 opacity-[0.03] transition-colors duration-500 pointer-events-none mix-blend-screen"
              style={{ backgroundColor: "var(--theme-accent)" }}
            />

            <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar h-full">
              {activeView === "settings" && <SettingsView onBack={() => setActiveView("download")} />}
              {activeView === "history" && <HistoryView onBack={() => setActiveView("download")} onRedownload={handleRedownload} />}

              {/* Download View */}
              <div className={cn("h-full flex flex-col", activeView !== "download" && "hidden")}>
                <header className="px-8 py-8 shrink-0 relative z-20">
                  <h1 className="font-semibold text-3xl tracking-tight text-primary mb-1.5">Download Media</h1>
                  <p className="text-[15px] text-tertiary">The cleanest way to save media locally.</p>
                </header>
                <div className="px-8 flex-1 pb-16 overflow-y-auto">
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
                              onCopyUrl={() => copyUrl(idx)}
                              onRemove={() => removeCard(idx)}
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

                {/* Fixed bottom bar */}
                <div className="shrink-0 px-6 py-2 z-30">
                  <DownloadAllBar
                    cards={cards}
                    category={category}
                    readyCount={readyCount}
                    queuedCount={queuedCount}
                    downloadingCount={downloadingCount}
                    doneCount={doneCount}
                    errorCount={errorCount}
                    allDoneFlash={allDoneFlash}
                    downloadPath={config.downloadPath ?? undefined}
                    onDownloadAll={downloadAll}
                    onRetryFailed={retryFailed}
                    onSetAllQuality={setAllQuality}
                  />
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

            {detection && <ClipboardToast detection={detection} onGrab={handleGrab} onDismiss={dismissToast} />}
          </div>
        </MacOSSidebar>
    </div>
  );
}
