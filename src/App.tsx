import { useState } from "react";
import { Settings as SettingsIcon, FolderOpen } from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { InputArea } from "@/components/InputArea";
import { VideoCard } from "@/components/VideoCard";
import { DownloadAllBar } from "@/components/DownloadAllBar";
import { SettingsView } from "@/components/SettingsView";
import { EmptyState } from "@/components/EmptyState";
import { VIDEO_FORMATS, AUDIO_FORMATS } from "@/types";
import * as tauri from "@/lib/tauri";

type ViewState = "main" | "settings";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>("main");
  const [urls, setUrls] = useState("");
  const { config, isLoaded } = useConfig();

  const {
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
  } = useDownloadManager(config);

  const readyCount = cards.filter((c) => c.status === "ready").length;
  const formats = category === "video" ? VIDEO_FORMATS : AUDIO_FORMATS;
  const formatLabel = formats.find((f) => f.id === outputFormat)?.label ?? outputFormat.toUpperCase();
  const formatDisplay = `${formatLabel} ${category === "video" ? "Video" : "Audio"}`;

  const handleFetch = () => {
    if (!urls.trim() || isFetching) return;
    fetchUrls(urls);
  };

  if (!isLoaded) {
    return <div className="h-screen bg-base" />;
  }

  if (currentView === "settings") {
    return (
      <div className="h-screen flex flex-col bg-base bg-noise overflow-hidden">
        <SettingsView onBack={() => setCurrentView("main")} />
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
        </div>
        <button
          onClick={() => setCurrentView("settings")}
          className="p-2 rounded-lg hover:bg-hover text-secondary hover:text-primary transition-all border border-transparent hover:border-subtle"
          title="Settings"
        >
          <SettingsIcon size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto relative pb-32">
        <div className="px-6">
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

          {cards.length === 0 ? (
            <EmptyState />
          ) : (
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
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar: Open folder + Download All */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        {/* Open Downloads folder button */}
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

        {/* Download All floating bar */}
        {readyCount >= 2 && (
          <div className="px-6 pb-6">
            <DownloadAllBar readyCount={readyCount} onDownloadAll={downloadAll} />
          </div>
        )}
      </div>
    </div>
  );
}
