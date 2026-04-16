import { AlertTriangle, Loader2, CheckCircle2, X, FolderOpen, RotateCcw, Film, Music } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatFileSize, formatDuration } from "@/types/converter";
import { AudioWaveform } from "@/components/AudioWaveform";
import * as tauri from "@/lib/tauri";
import type { CompressCard } from "@/types/compressor";

interface Props {
  card: CompressCard;
  onStart: () => void;
  onCancel: () => void;
  onRemove: () => void;
}

function MediaPreview({ card }: { card: CompressCard }) {
  const info = card.mediaInfo;
  const isAudioOnly = info && !info.hasVideo;

  if (isAudioOnly) {
    return (
      <div className="w-[56px] h-[56px] rounded-lg overflow-hidden bg-raised ring-1 ring-black/10 shrink-0">
        <AudioWaveform seed={card.filePath + card.fileName} width={56} height={56} />
      </div>
    );
  }

  if (info?.hasVideo) {
    return (
      <div className="w-[56px] h-[56px] rounded-lg overflow-hidden bg-raised ring-1 ring-black/10 shrink-0 relative flex items-center justify-center bg-gradient-to-br from-hover to-active">
        <Film size={20} className="text-tertiary" />
        {info.height && (
          <div className="absolute bottom-0.5 right-0.5 bg-black/70 backdrop-blur-sm text-white font-bold text-[7px] px-1 py-0.5 rounded">
            {info.height}p
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-[56px] h-[56px] rounded-lg bg-raised ring-1 ring-black/10 shrink-0 flex items-center justify-center">
      <Music size={20} className="text-tertiary" />
    </div>
  );
}

function MediaMeta({ card }: { card: CompressCard }) {
  const info = card.mediaInfo;
  if (!info) return null;
  const parts: string[] = [];
  if (info.hasVideo && info.width && info.height) parts.push(`${info.width}x${info.height}`);
  if (info.hasVideo && info.videoCodec) parts.push(info.videoCodec.toUpperCase());
  if (info.hasAudio && info.audioCodec) parts.push(info.audioCodec.toUpperCase());
  if (info.durationSecs > 0) parts.push(formatDuration(info.durationSecs));
  if (info.fileSize > 0) parts.push(formatFileSize(info.fileSize));
  if (parts.length === 0) return null;
  return (
    <p className="text-[10px] text-tertiary truncate">{parts.join(" · ")}</p>
  );
}

export function CompressionCard({ card, onStart, onCancel, onRemove }: Props) {
  // Probing state
  if (card.status === "probing") {
    return (
      <div className="glass-card rounded-xl p-4 flex gap-4 animate-card-enter">
        <div className="w-[56px] h-[56px] rounded-lg shrink-0 shimmer" />
        <div className="flex-1 space-y-2 py-1">
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
        <div className="flex items-start gap-4 ml-2">
          <MediaPreview card={card} />
          <div className="flex-1 min-w-0">
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
        <div className="flex items-center gap-4">
          <MediaPreview card={card} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-tertiary truncate">{card.fileName}</p>
            <p className="text-[11px] text-tertiary">Cancelled</p>
          </div>
          <button onClick={onRemove} className="p-1.5 rounded-md hover:bg-hover text-tertiary hover:text-error transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Compressing state
  if (card.status === "compressing") {
    const pct = card.progress ?? 0;
    const r = Math.round(232 - (232 - 0) * (pct / 100));
    const g = Math.round(93 + (255 - 93) * (pct / 100));
    const b = Math.round(42 + (106 - 42) * (pct / 100));
    const barColor = `rgb(${r}, ${g}, ${b})`;
    const glowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;

    return (
      <div className="glass-card rounded-xl p-4 animate-card-enter">
        <div className="flex items-center gap-4 mb-3">
          <MediaPreview card={card} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
              <span className="text-[13px] font-medium text-primary truncate">{card.fileName}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {card.totalPasses != null && card.currentPass != null && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                  Pass {card.currentPass}/{card.totalPasses}
                </span>
              )}
              {card.speed && <span className="text-[11px] font-mono text-secondary">{card.speed}</span>}
              <span className="text-[12px] font-medium text-secondary tabular-nums">{Math.round(pct)}%</span>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-md hover:bg-hover text-tertiary hover:text-error transition-colors shrink-0" title="Cancel">
            <X size={14} />
          </button>
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
    const originalSize = card.mediaInfo?.fileSize ?? 0;
    const outputSize = card.outputSize ?? 0;
    const reduction = originalSize > 0 ? Math.round((1 - outputSize / originalSize) * 100) : 0;

    return (
      <div className="glass-card border-success/20 rounded-xl p-4 animate-card-enter">
        <div className="flex items-center gap-4 mb-3">
          <MediaPreview card={card} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span className="text-[13px] font-medium text-primary truncate">{card.outputFilename}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {originalSize > 0 && outputSize > 0 && (
                <span className="text-[11px] text-tertiary">
                  {formatFileSize(originalSize)} → {formatFileSize(outputSize)}
                </span>
              )}
              {reduction > 0 && (
                <span className="text-[10px] font-semibold text-success">
                  {reduction}% smaller
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => card.outputPath ? tauri.showInFolder(card.outputPath) : tauri.openDownloadFolder()}
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

  // Ready state
  return (
    <div className="glass-card glass-border rounded-xl p-4 animate-card-enter hover:bg-compress/5 transition-all group overflow-hidden relative">
      <div className="flex items-center gap-4">
        <MediaPreview card={card} />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-primary truncate block">{card.fileName}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/15 text-accent">
              {card.settings.preset === "custom" ? "CUSTOM" : PRESET_LABELS[card.settings.preset] || card.settings.preset.toUpperCase()}
            </span>
            <MediaMeta card={card} />
          </div>
        </div>
        <button onClick={onRemove} className="p-1.5 rounded-md hover:bg-hover text-tertiary hover:text-error transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

const PRESET_LABELS: Record<string, string> = {
  "quick-shrink": "QUICK",
  "balanced": "BALANCED",
  "maximum": "MAX",
  "social-media": "SOCIAL",
  "email-friendly": "EMAIL",
};
