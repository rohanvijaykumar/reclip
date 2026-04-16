import { Download, CheckCircle2, AlertTriangle, RotateCcw, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { QualitySelector } from "./QualityChip";
import type { FormatCategory, CardData } from "@/types";
import * as tauri from "@/lib/tauri";

interface Props {
  cards: CardData[];
  category: FormatCategory;
  readyCount: number;
  downloadingCount: number;
  queuedCount: number;
  doneCount: number;
  errorCount: number;
  allDoneFlash: boolean;
  downloadPath: string | undefined;
  onDownloadAll: () => void;
  onRetryFailed: () => void;
  onSetAllQuality: (formatId: string) => void;
}

export function DownloadAllBar({
  cards, category, readyCount, downloadingCount, queuedCount, doneCount, errorCount,
  allDoneFlash, downloadPath, onDownloadAll, onRetryFailed, onSetAllQuality,
}: Props) {
  const isActive = downloadingCount > 0 || queuedCount > 0;
  const hasErrors = errorCount > 0 && !isActive;
  const allDone = allDoneFlash;
  const showStatus = readyCount >= 2 || isActive || allDone || (hasErrors && doneCount > 0);

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

  const folderLabel = downloadPath
    ? downloadPath.split(/[/\\]/).pop()
    : "Downloads";

  return (
    <div className="glass-panel rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 ring-1 ring-white/5">
      {/* Left: always-visible folder button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => tauri.openDownloadFolder()}
        className="text-[11px] text-muted-foreground h-7 px-2 gap-1.5"
      >
        <FolderOpen size={13} />
        {folderLabel}
      </Button>

      {/* Right: dynamic status content */}
      {showStatus && (
        <div className="flex items-center gap-2">
          {/* All done */}
          {allDone && !hasErrors && (
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-[11px] gap-1 animate-fade-in">
              <CheckCircle2 size={12} /> All complete
            </Badge>
          )}

          {/* Error + done mixed */}
          {hasErrors && doneCount > 0 && !allDone && (
            <>
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-[11px] gap-1">
                <CheckCircle2 size={12} /> {doneCount} saved
              </Badge>
              <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20 text-[11px] gap-1">
                <AlertTriangle size={12} /> {errorCount} failed
              </Badge>
              <Button size="sm" onClick={onRetryFailed} className="h-7 text-[11px] gap-1 px-3">
                <RotateCcw size={12} /> Retry
              </Button>
            </>
          )}

          {/* Active downloading */}
          {isActive && !allDone && !(hasErrors && doneCount > 0) && (
            <>
              {downloadingCount > 0 && (
                <Badge variant="outline" className="text-[11px] gap-1">
                  <Download size={12} className="text-[var(--theme-accent)]" /> {downloadingCount} downloading
                </Badge>
              )}
              {queuedCount > 0 && (
                <Badge variant="secondary" className="text-[11px]">
                  {queuedCount} queued
                </Badge>
              )}
              {doneCount > 0 && (
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-[11px] gap-1">
                  <CheckCircle2 size={12} /> {doneCount} done
                </Badge>
              )}
            </>
          )}

          {/* Ready state */}
          {!isActive && !allDone && !(hasErrors && doneCount > 0) && readyCount >= 2 && (
            <>
              <span className="text-[12px] font-medium text-foreground shrink-0">{readyCount} ready</span>

              {qualities.length > 0 && (
                <div className="hidden sm:block">
                  <QualitySelector
                    formats={qualities}
                    selectedId={undefined}
                    onSelect={onSetAllQuality}
                    layoutPrefix="bulk-quality"
                  />
                </div>
              )}

              <Button size="sm" onClick={onDownloadAll} className="h-7 text-[11px] gap-1.5 px-3">
                <Download size={13} /> Download All
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
