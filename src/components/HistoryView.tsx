import { useState, useEffect } from "react";
import { ChevronLeft, FolderOpen, RotateCcw, Trash2, Clock, Download, ArrowLeftRight, Minimize2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ImageWithFallback } from "./ImageWithFallback";
import * as tauri from "@/lib/tauri";
import type { HistoryEntry } from "@/types";

interface Props {
  onBack: () => void;
  onRedownload: (url: string) => void;
}

type HistoryTab = "downloads" | "conversions" | "compressions";

function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

export function HistoryView({ onBack, onRedownload }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HistoryTab>("downloads");

  useEffect(() => {
    tauri.getHistory().then((h) => {
      setHistory(h);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const handleClear = async () => {
    await tauri.clearHistory();
    setHistory([]);
  };

  const downloads = history.filter((e) => e.format === "video" || e.format === "audio");
  const conversions = history.filter((e) => e.format === "convert");
  const compressions = history.filter((e) => e.format === "compress");
  const filtered = activeTab === "downloads" ? downloads : activeTab === "conversions" ? conversions : compressions;

  const emptyMessages: Record<HistoryTab, { title: string; body: string }> = {
    downloads: { title: "No downloads yet", body: "Your download history will appear here after you download media." },
    conversions: { title: "No conversions yet", body: "Your conversion history will appear here after you convert files." },
    compressions: { title: "No compressions yet", body: "Your compression history will appear here after you compress files." },
  };

  return (
    <div className="flex flex-col h-full bg-base text-primary animate-slide-in-right z-30 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-subtle bg-base sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 -ml-2 rounded-md hover:bg-hover text-secondary hover:text-primary transition-colors flex items-center gap-1"
          >
            <ChevronLeft size={20} />
            <span className="text-[13px] font-medium">Back</span>
          </button>
          <div className="h-4 w-[1px] bg-subtle mx-1" />
          <h2 className="font-semibold text-[15px] tracking-tight">History</h2>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-tertiary hover:text-error rounded-md hover:bg-error/10 transition-colors"
          >
            <Trash2 size={14} /> Clear All
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex glass-card rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("downloads")}
            className={cn(
              "px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
              activeTab === "downloads"
                ? "bg-hover text-primary shadow-sm"
                : "text-tertiary hover:text-secondary"
            )}
          >
            <Download size={14} /> Downloads
            {downloads.length > 0 && (
              <span className="text-[10px] bg-subtle px-1.5 py-0.5 rounded-full ml-0.5">{downloads.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("conversions")}
            className={cn(
              "px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
              activeTab === "conversions"
                ? "bg-hover text-primary shadow-sm"
                : "text-tertiary hover:text-secondary"
            )}
          >
            <ArrowLeftRight size={14} /> Conversions
            {conversions.length > 0 && (
              <span className="text-[10px] bg-subtle px-1.5 py-0.5 rounded-full ml-0.5">{conversions.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("compressions")}
            className={cn(
              "px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
              activeTab === "compressions"
                ? "bg-hover text-primary shadow-sm"
                : "text-tertiary hover:text-secondary"
            )}
          >
            <Minimize2 size={14} /> Compressions
            {compressions.length > 0 && (
              <span className="text-[10px] bg-subtle px-1.5 py-0.5 rounded-full ml-0.5">{compressions.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex flex-col gap-4 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-xl p-4 flex gap-4">
                <div className="w-[100px] h-[56px] rounded-lg shimmer shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-[60%] shimmer rounded-md" />
                  <div className="h-3 w-[30%] shimmer rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center mb-4">
              <Clock className="w-7 h-7 text-tertiary" />
            </div>
            <h3 className="text-[15px] font-medium text-primary mb-2">
              {emptyMessages[activeTab].title}
            </h3>
            <p className="text-[13px] text-tertiary max-w-[260px]">
              {emptyMessages[activeTab].body}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-4 pb-8">
            {filtered.map((entry) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                showRedownload={activeTab === "downloads"}
                onRedownload={() => onRedownload(entry.url)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryCard({ entry, showRedownload, onRedownload }: { entry: HistoryEntry; showRedownload: boolean; onRedownload: () => void }) {
  const formatBadge = entry.outputFormat?.toUpperCase() || entry.format?.toUpperCase() || "—";

  const iconForFormat = () => {
    if (entry.format === "compress") return <Minimize2 className="w-5 h-5 text-tertiary" />;
    if (entry.format === "convert") return <ArrowLeftRight className="w-5 h-5 text-tertiary" />;
    return <Download className="w-5 h-5 text-tertiary" />;
  };

  const displayTitle = (entry.format === "convert" || entry.format === "compress")
    ? entry.filename
    : (entry.title || entry.filename);

  return (
    <div className="glass-card rounded-xl p-4 flex gap-4 group transition-all hover:border-focus/30">
      {/* Thumbnail */}
      <div className="w-[100px] h-[56px] shrink-0 rounded-lg overflow-hidden bg-raised ring-1 ring-black/10">
        {entry.thumbnail ? (
          <ImageWithFallback
            src={entry.thumbnail}
            alt={entry.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {iconForFormat()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h4 className="text-[13px] font-medium text-primary truncate leading-snug" title={displayTitle}>
            {displayTitle}
          </h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded",
              entry.format === "audio" || entry.format === "convert" || entry.format === "compress"
                ? "bg-accent/15 text-accent"
                : "bg-primary/10 text-secondary"
            )}>
              {formatBadge}
            </span>
            {entry.quality && (
              <span className="text-[11px] text-tertiary">{entry.quality}</span>
            )}
            <span className="text-[11px] text-tertiary">{formatDate(entry.timestamp)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => entry.savedPath ? tauri.showInFolder(entry.savedPath) : tauri.openDownloadFolder()}
          className="p-2 rounded-md hover:bg-hover text-tertiary hover:text-primary transition-colors"
          title="Show in folder"
        >
          <FolderOpen size={14} />
        </button>
        {showRedownload && (
          <button
            onClick={onRedownload}
            className="p-2 rounded-md hover:bg-accent/15 text-tertiary hover:text-accent transition-colors"
            title="Re-download"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
