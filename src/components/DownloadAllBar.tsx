import { Download, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { QualityChip } from "./QualityChip";
import type { FormatCategory, CardData } from "@/types";

interface Props {
  cards: CardData[];
  category: FormatCategory;
  readyCount: number;
  downloadingCount: number;
  queuedCount: number;
  doneCount: number;
  errorCount: number;
  allDoneFlash: boolean;
  onDownloadAll: () => void;
  onRetryFailed: () => void;
  onSetAllQuality: (formatId: string) => void;
}

export function DownloadAllBar({
  cards, category, readyCount, downloadingCount, queuedCount, doneCount, errorCount,
  allDoneFlash, onDownloadAll, onRetryFailed, onSetAllQuality,
}: Props) {
  const isActive = downloadingCount > 0 || queuedCount > 0;
  const hasErrors = errorCount > 0 && !isActive;
  const allDone = allDoneFlash;

  // Find common quality options for bulk selector
  const readyCards = cards.filter((c) => c.status === "ready" && c.formats && c.formats.length > 0);
  const commonHeights = (() => {
    if (readyCards.length === 0) return [];
    const heightSet = new Set<number>();
    readyCards.forEach((c) => c.formats!.forEach((f) => heightSet.add(f.height)));
    return Array.from(heightSet).sort((a, b) => b - a);
  })();

  const videoQualities = commonHeights.map((h) => ({ id: String(h), label: `${h}p` }));
  const audioQualities = [
    { id: "320", label: "320kbps" },
    { id: "192", label: "192kbps" },
    { id: "128", label: "128kbps" },
  ];

  const qualities = category === "video" ? videoQualities : audioQualities;

  // All done state
  if (allDone && !hasErrors) {
    return (
      <div className="glass-panel shadow-2xl rounded-xl p-4 flex items-center justify-center ring-1 ring-success/20 animate-card-enter opacity-0">
        <div className="flex items-center gap-2 text-success font-semibold text-[14px]">
          <CheckCircle2 size={18} /> All downloads complete
        </div>
      </div>
    );
  }

  // Error state (after all done, some failed)
  if (hasErrors && doneCount > 0) {
    return (
      <div className="glass-panel shadow-2xl rounded-xl p-4 flex items-center justify-between ring-1 ring-white/5 glow-accent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-success text-[13px] font-medium">
            <CheckCircle2 size={16} /> {doneCount} saved
          </div>
          <div className="flex items-center gap-2 text-error text-[13px] font-medium">
            <AlertTriangle size={16} /> {errorCount} failed
          </div>
        </div>
        <button
          onClick={onRetryFailed}
          className="h-10 px-5 bg-accent hover:bg-accent-hover active:scale-[0.98] text-accent-text font-semibold text-[13px] rounded-lg transition-all shadow-md flex items-center gap-2"
        >
          <RotateCcw size={14} /> Retry Failed
        </button>
      </div>
    );
  }

  // Active downloading state
  if (isActive) {
    return (
      <div className="glass-panel shadow-2xl rounded-xl p-4 flex items-center justify-between ring-1 ring-white/5">
        <div className="flex items-center gap-3">
          {downloadingCount > 0 && (
            <span className="text-[13px] font-medium text-primary flex items-center gap-1.5">
              <Download size={14} className="text-accent" /> {downloadingCount} downloading
            </span>
          )}
          {queuedCount > 0 && (
            <span className="text-[13px] text-secondary">
              {queuedCount} queued
            </span>
          )}
        </div>
        {doneCount > 0 && (
          <span className="text-[13px] font-medium text-success flex items-center gap-1.5">
            <CheckCircle2 size={14} /> {doneCount} done
          </span>
        )}
      </div>
    );
  }

  // Ready state (normal)
  if (readyCount < 2) return null;

  return (
    <div className="glass-panel shadow-2xl rounded-xl p-4 flex items-center justify-between gap-4 ring-1 ring-white/5 glow-accent">
      {/* Left: count */}
      <span className="text-[14px] font-medium text-primary shrink-0">{readyCount} items ready</span>

      {/* Center: bulk quality chips */}
      {qualities.length > 0 && (
        <div className="flex gap-1.5 flex-wrap glass-card p-1 rounded-lg">
          <span className="text-[10px] text-tertiary px-1.5 py-1 font-medium">All:</span>
          {qualities.map((q) => (
            <QualityChip
              key={q.id}
              label={q.label}
              selected={false}
              onClick={() => onSetAllQuality(q.id)}
            />
          ))}
        </div>
      )}

      {/* Right: download button */}
      <button
        onClick={onDownloadAll}
        className="h-10 px-6 bg-accent hover:bg-accent-hover active:scale-[0.98] text-accent-text font-semibold text-[13px] rounded-lg transition-all shadow-md flex items-center gap-2 shrink-0"
      >
        <Download size={16} /> Download All
      </button>
    </div>
  );
}
