import { AlertTriangle, Loader2, CheckCircle2, X, FolderOpen, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatFileSize } from "@/types/converter";
import * as tauri from "@/lib/tauri";
import type { ConvertCard } from "@/types/converter";

interface Props {
  card: ConvertCard;
  onStart: () => void;
  onCancel: () => void;
  onRemove: () => void;
}

export function ConversionCard({ card, onStart, onCancel, onRemove }: Props) {
  // Probing state
  if (card.status === "probing") {
    return (
      <div className="glass-card rounded-xl p-4 flex gap-4 animate-card-enter">
        <div className="w-10 h-10 rounded-lg shrink-0 shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-[60%] shimmer rounded-md" />
          <div className="h-3 w-[30%] shimmer rounded-md" />
        </div>
      </div>
    );
  }

  // Error state
  if (card.status === "error") {
    return (
      <div className="glass-card border-error/20 rounded-xl p-4 animate-card-enter relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-error" />
        <div className="flex items-start justify-between gap-4 ml-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-error shrink-0" />
              <span className="text-[13px] font-medium text-error truncate">{card.error}</span>
            </div>
            <p className="text-[11px] text-tertiary truncate">{card.fileName}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={onStart} className="p-1.5 rounded-md hover:bg-hover text-tertiary hover:text-primary transition-colors" title="Retry">
              <RotateCcw size={14} />
            </button>
            <button onClick={onRemove} className="p-1.5 rounded-md hover:bg-hover text-tertiary hover:text-error transition-colors" title="Remove">
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Cancelled state
  if (card.status === "cancelled") {
    return (
      <div className="glass-card rounded-xl p-4 animate-card-enter opacity-60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-tertiary">{card.fileName}</p>
            <p className="text-[11px] text-tertiary">Cancelled</p>
          </div>
          <button onClick={onRemove} className="p-1.5 rounded-md hover:bg-hover text-tertiary hover:text-error transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Converting state
  if (card.status === "converting") {
    const pct = card.progress ?? 0;
    const r = Math.round(232 - (232 - 0) * (pct / 100));
    const g = Math.round(93 + (255 - 93) * (pct / 100));
    const b = Math.round(42 + (106 - 42) * (pct / 100));
    const barColor = `rgb(${r}, ${g}, ${b})`;
    const glowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;

    return (
      <div className="glass-card rounded-xl p-4 animate-card-enter">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
            <span className="text-[13px] font-medium text-primary truncate">{card.fileName}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {card.speed && <span className="text-[11px] font-mono text-secondary">{card.speed}</span>}
            <span className="text-[12px] font-medium text-secondary tabular-nums">{Math.round(pct)}%</span>
            <button onClick={onCancel} className="p-1 rounded-md hover:bg-hover text-tertiary hover:text-error transition-colors" title="Cancel">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="h-1.5 w-full bg-progress-track rounded-full overflow-hidden ring-1 ring-inset ring-white/5">
          <div
            className="h-full transition-all duration-300 ease-out rounded-full"
            style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: `0 0 10px ${glowColor}` }}
          />
        </div>
      </div>
    );
  }

  // Done state
  if (card.status === "done") {
    return (
      <div className="glass-card border-success/20 rounded-xl p-4 animate-card-enter">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span className="text-[13px] font-medium text-primary truncate">{card.outputFilename}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {card.outputSize != null && (
              <span className="text-[11px] text-tertiary">{formatFileSize(card.outputSize)}</span>
            )}
            <button
              onClick={() => tauri.openDownloadFolder()}
              className="p-1.5 rounded-md hover:bg-hover text-tertiary hover:text-primary transition-colors"
              title="Show in folder"
            >
              <FolderOpen size={14} />
            </button>
            <button onClick={onRemove} className="p-1.5 rounded-md hover:bg-hover text-tertiary hover:text-error transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="h-1.5 w-full bg-progress-track rounded-full overflow-hidden ring-1 ring-inset ring-white/5">
          <div className="h-full w-full rounded-full" style={{ backgroundColor: "#00FF6A", boxShadow: "0 0 10px rgba(0, 255, 106, 0.7)" }} />
        </div>
      </div>
    );
  }

  // Ready state — just show filename (settings are in ConversionSettings panel)
  return (
    <div className="glass-card rounded-xl p-4 animate-card-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-medium text-primary truncate">{card.fileName}</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/15 text-accent">
            {card.settings.outputFormat.toUpperCase()}
          </span>
        </div>
        <button onClick={onRemove} className="p-1.5 rounded-md hover:bg-hover text-tertiary hover:text-error transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
