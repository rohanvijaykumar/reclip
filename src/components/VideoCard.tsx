import { useState, useMemo } from "react";
import { AlertTriangle, Loader2, Download, CheckCircle2, FolderOpen, Pencil, TriangleAlert, Clock, RotateCcw, CheckSquare, Square, Copy, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmtDur, fmtSize, friendlyError, detectPlatformFromUrl } from "@/lib/utils";
import { ImageWithFallback } from "./ImageWithFallback";
import { PlatformIcon } from "./PlatformIcon";
import { AudioWaveform } from "./AudioWaveform";
import { QualitySelector } from "./QualityChip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import * as tauri from "@/lib/tauri";
import type { CardData, FormatCategory } from "@/types";

interface Props {
  data: CardData;
  index: number;
  formatLabel: string;
  category: FormatCategory;
  onDownload: () => void;
  onPickFormat: (formatId: string) => void;
  onRename: (name: string) => void;
  onDismissDuplicate?: () => void;
  onSkip?: () => void;
  onCopyUrl?: () => void;
  onRemove?: () => void;
  onToggleCheck?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function VideoCard({
  data, index, formatLabel, category,
  onDownload, onPickFormat, onRename, onDismissDuplicate, onSkip,
  onCopyUrl, onRemove, onToggleCheck, draggable, onDragStart, onDragOver, onDrop,
}: Props) {

  const platform = useMemo(() => detectPlatformFromUrl(data.url), [data.url]);
  const isAudio = category === "audio";

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
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-error" />
                <span className="font-semibold text-[14px] text-error">Fetch Failed</span>
              </div>
              <div className="flex items-center gap-1">
                {onCopyUrl && (
                  <Button variant="ghost" size="icon-sm" onClick={onCopyUrl} className="text-tertiary hover:text-primary h-7 w-7">
                    <Copy size={13} />
                  </Button>
                )}
                {onRemove && (
                  <Button variant="ghost" size="icon-sm" onClick={onRemove} className="text-tertiary hover:text-error h-7 w-7">
                    <X size={13} />
                  </Button>
                )}
              </div>
            </div>
            <pre className="text-[10px] text-tertiary bg-black/20 p-2 rounded-md overflow-x-auto whitespace-pre font-mono max-h-[100px] scrollbar-thin">
              {data.error || "Unknown error"}
            </pre>
            <div className="font-mono text-[10px] text-tertiary/50 truncate max-w-[300px] mt-1">
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
          {platform && (
            <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/10">
              <PlatformIcon platform={platform} size={12} />
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-center py-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-error" />
              <span className="font-semibold text-[14px] text-error">Download Failed</span>
            </div>
            <div className="flex items-center gap-1">
              {onCopyUrl && (
                <Button variant="ghost" size="icon-sm" onClick={onCopyUrl} className="text-tertiary hover:text-primary h-7 w-7">
                  <Copy size={13} />
                </Button>
              )}
              {onRemove && (
                <Button variant="ghost" size="icon-sm" onClick={onRemove} className="text-tertiary hover:text-error h-7 w-7">
                  <X size={13} />
                </Button>
              )}
            </div>
          </div>
          <pre className="text-[10px] text-tertiary bg-black/20 p-2 rounded-md overflow-x-auto whitespace-pre font-mono max-h-[100px] scrollbar-thin mb-3">
            {data.error || "Unknown error"}
          </pre>
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

  // Retrying state
  if (data.status === "retrying") {
    return (
      <div
        className="glass-card rounded-xl p-4 flex gap-5 animate-card-enter opacity-0 overflow-hidden relative"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-warning" />
        <div className="w-[140px] h-[80px] shrink-0 relative rounded-lg overflow-hidden bg-raised ring-1 ring-black/10">
          {isAudio ? (
            <AudioWaveform seed={data.url + (data.title || "")} width={140} height={80} className="w-full h-full opacity-50" />
          ) : (
            <ImageWithFallback src={data.thumbnail || ""} alt={data.title || ""} className="w-full h-full object-cover opacity-50" />
          )}
          {platform && (
            <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/10">
              <PlatformIcon platform={platform} size={12} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-warning animate-spin" style={{ animationDuration: "2s" }} />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center py-0.5">
          <h3 className="font-semibold text-[15px] leading-snug tracking-tight text-primary line-clamp-1 mb-1">
            {data.customFilename || data.title || "Untitled"}
          </h3>
          <div className="flex items-center gap-2 text-[12px] text-warning font-medium">
            <Clock size={14} />
            Retrying in {data.retryingIn}s...
            <span className="text-tertiary font-normal">(attempt {(data.retryCount ?? 0)}/3)</span>
          </div>
        </div>
      </div>
    );
  }

  // Queued state
  if (data.status === "queued") {
    return (
      <div
        className={cn(
          "glass-card rounded-xl p-4 flex gap-5 animate-card-enter opacity-0 overflow-hidden relative",
          draggable && "cursor-grab active:cursor-grabbing"
        )}
        style={{ animationDelay: `${index * 80}ms` }}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="w-[140px] h-[80px] shrink-0 relative rounded-lg overflow-hidden bg-raised ring-1 ring-black/10">
          {isAudio ? (
            <AudioWaveform seed={data.url + (data.title || "")} width={140} height={80} className="w-full h-full opacity-60" />
          ) : (
            <ImageWithFallback src={data.thumbnail || ""} alt={data.title || ""} className="w-full h-full object-cover opacity-60" />
          )}
          {platform && (
            <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/10">
              <PlatformIcon platform={platform} size={12} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-base/80 backdrop-blur-sm rounded-md px-2.5 py-1 text-[11px] font-bold text-secondary tabular-nums">
              #{data.queuePosition ?? "?"}
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center py-0.5">
          <h3 className="font-semibold text-[15px] leading-snug tracking-tight text-primary line-clamp-1 mb-1">
            {data.customFilename || data.title || "Untitled"}
          </h3>
          <div className="text-[12px] text-secondary flex items-center gap-1.5">
            <Clock size={12} className="text-tertiary" />
            Queued #{data.queuePosition ?? "?"}
            <span className="w-1 h-1 rounded-full bg-tertiary inline-block" />
            {formatLabel}
          </div>
        </div>
        {onRemove && (
          <Button variant="ghost" size="icon-sm" onClick={onRemove} className="absolute top-3 right-3 text-tertiary hover:text-error h-7 w-7">
            <X size={13} />
          </Button>
        )}
      </div>
    );
  }

  const isDownloading = data.status === "downloading";
  const isDone = data.status === "done";
  const hasDuplicate = data.status === "ready" && data.duplicateInfo;
  const isPlaylistItem = !!data.playlistId;
  const isChecked = data.checked !== false;

  return (
    <div
      className={cn(
        "glass-card glass-border rounded-xl p-4 flex sm:flex-row flex-col gap-5 transition-all animate-card-enter opacity-0 relative group overflow-hidden",
        isDone && "border-success/20",
        isPlaylistItem && !isChecked && data.status === "ready" && "opacity-50"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Duplicate warning left border */}
      {hasDuplicate && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-warning" />
      )}

      {/* Playlist checkbox */}
      {isPlaylistItem && data.status === "ready" && (
        <button
          onClick={onToggleCheck}
          className="absolute top-3 left-3 z-10 p-0.5"
        >
          {isChecked ? (
            <CheckSquare size={16} className="text-accent" />
          ) : (
            <Square size={16} className="text-tertiary hover:text-secondary" />
          )}
        </button>
      )}

      {/* Inline actions — top right, visible on hover */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        {onCopyUrl && (
          <Button variant="ghost" size="icon-sm" onClick={onCopyUrl} className="text-tertiary hover:text-primary h-7 w-7 bg-base/60 backdrop-blur-sm">
            <Copy size={13} />
          </Button>
        )}
        {onRemove && (
          <Button variant="ghost" size="icon-sm" onClick={onRemove} className="text-tertiary hover:text-error h-7 w-7 bg-base/60 backdrop-blur-sm">
            <X size={13} />
          </Button>
        )}
      </div>

      {/* Thumbnail */}
      <div className={cn(
        "sm:w-[140px] w-full sm:h-[80px] h-[160px] shrink-0 relative rounded-lg overflow-hidden bg-raised ring-1 ring-black/10",
        isPlaylistItem && "sm:ml-4"
      )}>
        {isAudio && !isDownloading && !isDone ? (
          <AudioWaveform seed={data.url + (data.title || "")} width={140} height={80} className="w-full h-full" />
        ) : (
          <ImageWithFallback
            src={data.thumbnail || ""}
            alt={data.title || ""}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        {/* Platform badge */}
        {platform && (
          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/10">
            <PlatformIcon platform={platform} size={12} />
          </div>
        )}
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
          {/* Editable filename (only in ready state) */}
          {data.status === "ready" ? (
            <EditableFilename
              value={data.customFilename ?? data.title ?? ""}
              onChange={onRename}
            />
          ) : (
            <h3 className="font-semibold text-[15px] leading-snug tracking-tight text-primary line-clamp-2 mb-1" title={data.title}>
              {data.customFilename || data.title || "Untitled"}
            </h3>
          )}
          <div className="text-[12px] text-secondary flex items-center gap-1.5">
            {data.uploader}
            <span className="w-1 h-1 rounded-full bg-tertiary inline-block" />
            {formatLabel}
          </div>
        </div>

        {/* Duplicate warning banner */}
        {hasDuplicate && data.duplicateInfo && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <TriangleAlert size={14} className="text-warning shrink-0" />
              <span className="text-[11px] text-secondary leading-snug truncate">
                Previously downloaded on {data.duplicateInfo.date} as {data.duplicateInfo.quality} {data.duplicateInfo.format.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onDismissDuplicate}
                className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
              >
                Download again
              </button>
              <span className="w-px h-3 bg-subtle" />
              <button
                onClick={onSkip}
                className="text-[11px] font-medium text-tertiary hover:text-secondary transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Ready state */}
        {data.status === "ready" && (
          <div className="flex justify-between items-end mt-4 gap-4 flex-wrap">
            {category === "video" && data.formats && data.formats.length > 0 && (
              <QualitySelector
                formats={data.formats.map((f) => ({ id: f.id, label: f.label, size: fmtSize(f.filesize) }))}
                selectedId={data.selectedFormatId ?? undefined}
                onSelect={onPickFormat}
                layoutPrefix={`video-${index}`}
              />
            )}
            {category === "audio" && (
              <QualitySelector
                formats={[
                  { id: "320", label: "320kbps" },
                  { id: "192", label: "192kbps" },
                  { id: "128", label: "128kbps" },
                ]}
                selectedId={data.selectedFormatId ?? "320"}
                onSelect={onPickFormat}
                layoutPrefix={`audio-${index}`}
              />
            )}
            <Button
              size="sm"
              onClick={onDownload}
              disabled={isPlaylistItem && !isChecked}
              className="h-8 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
          </div>
        )}

        {/* Downloading state */}
        {isDownloading && (() => {
          const pct = data.progress ?? 0;
          const r = Math.round(232 - (232 - 0) * (pct / 100));
          const g = Math.round(93 + (255 - 93) * (pct / 100));
          const b = Math.round(42 + (106 - 42) * (pct / 100));
          const barColor = `rgb(${r}, ${g}, ${b})`;
          const glowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;

          return (
            <div className="mt-4 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {data.selectedFormatId && data.formats?.find((f) => f.id === data.selectedFormatId) && (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold">
                      {data.formats.find((f) => f.id === data.selectedFormatId)!.label}
                    </Badge>
                  )}
                  {data.speed && <span className="text-[11px] text-secondary font-mono">{data.speed}</span>}
                  {data.eta && <span className="text-[11px] text-tertiary font-mono">ETA {data.eta}</span>}
                </div>
                <div className="text-[12px] font-medium text-secondary tabular-nums">
                  {pct > 0 ? `${Math.round(pct)}%` : "Starting..."}
                </div>
              </div>
              <Progress
                value={pct}
                className="h-2 ring-1 ring-inset ring-white/10"
                indicatorClassName="transition-all duration-300 ease-out"
                indicatorStyle={{ backgroundColor: barColor, boxShadow: `0 0 12px ${glowColor}` }}
              />
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
            <Progress
              value={100}
              className="h-1.5 ring-1 ring-inset ring-white/10"
              indicatorClassName="bg-[#00FF6A]"
              indicatorStyle={{ boxShadow: "0 0 12px rgba(0, 255, 106, 0.7)" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function EditableFilename({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (isEditing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          if (draft.trim()) onChange(draft.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setIsEditing(false);
            if (draft.trim()) onChange(draft.trim());
          }
          if (e.key === "Escape") {
            setIsEditing(false);
            setDraft(value);
          }
        }}
        className="w-full bg-transparent border-b border-accent text-[15px] font-semibold text-primary leading-snug tracking-tight focus:outline-none py-0.5 mb-0.5"
      />
    );
  }

  return (
    <div className="flex items-start gap-1.5 group/name mb-1">
      <h3
        className="font-semibold text-[15px] leading-snug tracking-tight text-primary line-clamp-2 cursor-text"
        onClick={() => { setDraft(value); setIsEditing(true); }}
        title="Click to rename"
      >
        {value || "Untitled"}
      </h3>
      <button
        onClick={() => { setDraft(value); setIsEditing(true); }}
        className="p-0.5 rounded text-tertiary hover:text-accent opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0 mt-0.5"
        title="Rename"
      >
        <Pencil size={12} />
      </button>
    </div>
  );
}
