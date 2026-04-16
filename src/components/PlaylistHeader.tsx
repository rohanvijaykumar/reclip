import { ListVideo, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmtDur } from "@/lib/utils";
import { QualitySelector } from "./QualityChip";
import type { PlaylistHeaderData, FormatCategory, CardData } from "@/types";

interface Props {
  data: PlaylistHeaderData;
  cards: CardData[];
  category: FormatCategory;
  onToggleAll: (checked: boolean) => void;
  onSetAllQuality: (formatId: string) => void;
}

export function PlaylistHeader({ data, cards, category, onToggleAll, onSetAllQuality }: Props) {
  const playlistCards = cards.filter((c) => c.playlistId === data.id);
  const checkedCount = playlistCards.filter((c) => c.checked !== false).length;
  const allChecked = checkedCount === playlistCards.length;
  const noneChecked = checkedCount === 0;

  // Find common formats across all playlist items
  const commonFormats = (() => {
    const readyCards = playlistCards.filter((c) => c.formats && c.formats.length > 0);
    if (readyCards.length === 0) return [];
    // Collect all unique heights
    const heightSet = new Set<number>();
    readyCards.forEach((c) => c.formats!.forEach((f) => heightSet.add(f.height)));
    return Array.from(heightSet)
      .sort((a, b) => b - a)
      .map((h) => ({ id: String(h), label: `${h}p`, height: h }));
  })();

  const audioQualities = [
    { id: "320", label: "320kbps" },
    { id: "192", label: "192kbps" },
    { id: "128", label: "128kbps" },
  ];

  return (
    <div className="glass-card rounded-xl p-4 mb-4 animate-card-enter opacity-0">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
          <ListVideo size={20} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] text-primary truncate">{data.title}</h3>
          <div className="text-[12px] text-secondary flex items-center gap-1.5">
            {data.uploader && (
              <>
                {data.uploader}
                <span className="w-1 h-1 rounded-full bg-tertiary inline-block" />
              </>
            )}
            {data.videoCount} videos
            {data.totalDuration > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-tertiary inline-block" />
                {fmtDur(data.totalDuration)}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Select all / deselect */}
        <button
          onClick={() => onToggleAll(noneChecked || !allChecked)}
          className="flex items-center gap-2 text-[12px] font-medium text-secondary hover:text-primary transition-colors"
        >
          {allChecked ? (
            <CheckSquare size={14} className="text-accent" />
          ) : (
            <Square size={14} />
          )}
          {allChecked ? "Deselect all" : "Select all"}
          <span className="text-tertiary ml-1">({checkedCount}/{playlistCards.length})</span>
        </button>

        {/* Bulk quality selector */}
        {category === "video" && commonFormats.length > 0 && (
          <QualitySelector
            formats={commonFormats.map((f) => ({ id: f.id, label: f.label }))}
            selectedId={undefined}
            onSelect={onSetAllQuality}
            layoutPrefix={`playlist-video-${data.id}`}
          />
        )}
        {category === "audio" && (
          <QualitySelector
            formats={audioQualities}
            selectedId={undefined}
            onSelect={onSetAllQuality}
            layoutPrefix={`playlist-audio-${data.id}`}
          />
        )}
      </div>
    </div>
  );
}
