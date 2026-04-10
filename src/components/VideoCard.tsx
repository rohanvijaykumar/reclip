import { AlertTriangle, Loader2, Download, CheckCircle2, FolderOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmtDur, friendlyError } from "@/lib/utils";
import { ImageWithFallback } from "./ImageWithFallback";
import { QualityChip } from "./QualityChip";
import * as tauri from "@/lib/tauri";
import type { CardData, FormatCategory } from "@/types";

interface Props {
  data: CardData;
  index: number;
  formatLabel: string;
  category: FormatCategory;
  onDownload: () => void;
  onPickFormat: (formatId: string) => void;
}

export function VideoCard({ data, index, formatLabel, category, onDownload, onPickFormat }: Props) {
  // Skeleton / loading state
  if (data.status === "loading") {
    return (
      <div
        className="glass-card rounded-xl p-4 flex gap-5 animate-card-enter opacity-0"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="w-[140px] h-[80px] rounded-lg shrink-0 shimmer" />
        <div className="flex-1 flex flex-col justify-between py-1">
          <div className="space-y-3">
            <div className="h-4 w-[75%] shimmer rounded-md" />
            <div className="h-4 w-[40%] shimmer rounded-md" />
          </div>
          <div className="flex gap-2 mt-4">
            <div className="h-6 w-14 shimmer rounded-md" />
            <div className="h-6 w-14 shimmer rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  // Info-error state
  if (data.status === "info-error") {
    return (
      <div
        className="glass-card border-error/20 rounded-xl p-4 flex gap-5 animate-card-enter opacity-0 overflow-hidden relative"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-error" />
        <div className="w-[140px] h-[80px] shrink-0 relative rounded-lg overflow-hidden bg-active flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-error/50" />
        </div>
        <div className="flex-1 flex flex-col justify-center py-1">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-4 h-4 text-error" />
            <span className="font-semibold text-[14px] text-error">
              {friendlyError(data.error || "Could not fetch video")}
            </span>
          </div>
          <div className="font-mono text-[11px] text-tertiary truncate max-w-[300px]">
            {data.url}
          </div>
        </div>
      </div>
    );
  }

  // Download error state
  if (data.status === "error") {
    return (
      <div
        className="glass-card border-error/20 rounded-xl p-4 flex gap-5 animate-card-enter opacity-0 overflow-hidden relative"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-error" />
        <div className="w-[140px] h-[80px] shrink-0 relative rounded-lg overflow-hidden bg-active">
          <ImageWithFallback src={data.thumbnail || ""} alt="thumbnail" className="w-full h-full object-cover opacity-40 grayscale" />
        </div>
        <div className="flex-1 flex flex-col justify-center py-1">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-4 h-4 text-error" />
            <span className="font-semibold text-[14px] text-error">
              {friendlyError(data.error || "Download failed")}
            </span>
          </div>
          <div className="font-mono text-[11px] text-tertiary truncate max-w-[300px] mb-4">
            {data.url}
          </div>
          <button
            onClick={onDownload}
            className="h-8 px-4 glass-card hover:border-error text-secondary hover:text-error font-medium text-[12px] rounded-lg transition-colors shadow-sm w-fit"
          >
            Retry Download
          </button>
        </div>
      </div>
    );
  }

  const isDownloading = data.status === "downloading";
  const isDone = data.status === "done";

  return (
    <div
      className={cn(
        "glass-card glass-border rounded-xl p-4 flex sm:flex-row flex-col gap-5 transition-all animate-card-enter opacity-0 relative group",
        isDone && "border-success/20"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Thumbnail */}
      <div className="sm:w-[140px] w-full sm:h-[80px] h-[160px] shrink-0 relative rounded-lg overflow-hidden bg-raised ring-1 ring-black/10">
        <ImageWithFallback
          src={data.thumbnail || ""}
          alt={data.title || ""}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {data.duration != null && (
          <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-md text-white font-medium text-[10px] px-2 py-0.5 rounded-md">
            {fmtDur(data.duration)}
          </div>
        )}
        {isDownloading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col justify-between py-0.5">
        <div>
          <h3 className="font-semibold text-[15px] leading-snug tracking-tight text-primary line-clamp-2 mb-1" title={data.title}>
            {data.title || "Untitled"}
          </h3>
          <div className="text-[12px] text-secondary flex items-center gap-1.5">
            {data.uploader}
            <span className="w-1 h-1 rounded-full bg-tertiary inline-block" />
            {formatLabel}
          </div>
        </div>

        {/* Ready state */}
        {data.status === "ready" && (
          <div className="flex justify-between items-end mt-4 gap-4 flex-wrap">
            {category === "video" && data.formats && data.formats.length > 0 && (
              <div className="flex gap-2 flex-wrap glass-card p-1 rounded-lg">
                {data.formats.map((f) => (
                  <QualityChip
                    key={f.id}
                    label={f.label}
                    selected={f.id === data.selectedFormatId}
                    onClick={() => onPickFormat(f.id)}
                  />
                ))}
              </div>
            )}
            {category === "audio" && (
              <div className="flex gap-2 flex-wrap glass-card p-1 rounded-lg">
                {[
                  { id: "320", label: "320kbps" },
                  { id: "192", label: "192kbps" },
                  { id: "128", label: "128kbps" },
                ].map((q) => (
                  <QualityChip
                    key={q.id}
                    label={q.label}
                    selected={q.id === (data.selectedFormatId ?? "320")}
                    onClick={() => onPickFormat(q.id)}
                  />
                ))}
              </div>
            )}
            <button
              onClick={onDownload}
              className="h-[32px] px-4 glass-card hover:border-focus text-primary font-medium text-[12px] rounded-lg transition-all flex items-center gap-1.5 shrink-0 hover:shadow active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
        )}

        {/* Downloading state */}
        {isDownloading && (() => {
          const pct = data.progress ?? 0;
          const r = Math.round(232 - (232 - 0) * (pct / 100));
          const g = Math.round(93 + (255 - 93) * (pct / 100));
          const b = Math.round(42 + (106 - 42) * (pct / 100));
          const barColor = `rgb(${r}, ${g}, ${b})`;
          const glowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;

          return (
            <div className="mt-4 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {data.selectedFormatId && data.formats?.find((f) => f.id === data.selectedFormatId) && (
                    <div className="glass-card px-2 py-0.5 rounded-md text-[11px] font-medium text-secondary opacity-50">
                      {data.formats.find((f) => f.id === data.selectedFormatId)!.label}
                    </div>
                  )}
                  {data.speed && <span className="text-[11px] text-secondary font-mono">{data.speed}</span>}
                  {data.eta && <span className="text-[11px] text-tertiary font-mono">ETA {data.eta}</span>}
                </div>
                <div className="text-[12px] font-medium text-secondary tabular-nums">
                  {pct > 0 ? `${Math.round(pct)}%` : "Starting..."}
                </div>
              </div>
              <div className="h-1.5 w-full bg-progress-track rounded-full overflow-hidden relative ring-1 ring-inset ring-white/5">
                <div
                  className="h-full transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: `0 0 10px ${glowColor}` }}
                >
                  <div className="absolute top-0 bottom-0 right-0 w-12 bg-gradient-to-r from-transparent to-white/40 animate-pulse-edge" />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Done state — auto-saved */}
        {isDone && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="text-[12px] font-medium text-success flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </div>
              <button
                onClick={() => tauri.openDownloadFolder()}
                className="flex items-center gap-1 text-[11px] text-tertiary hover:text-primary transition-colors"
              >
                <FolderOpen size={12} /> Show in folder
              </button>
            </div>
            <div className="h-1.5 w-full bg-progress-track rounded-full overflow-hidden ring-1 ring-inset ring-white/5">
              <div className="h-full w-full rounded-full" style={{ backgroundColor: "#00FF6A", boxShadow: "0 0 10px rgba(0, 255, 106, 0.7)" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
