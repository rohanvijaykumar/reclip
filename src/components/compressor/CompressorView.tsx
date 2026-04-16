import { useState } from "react";
import { Minimize2, X, Film, Music } from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { useCompressor } from "@/hooks/useCompressor";
import { FileInput } from "@/components/converter/FileInput";
import { CompressionSettings } from "./CompressionSettings";
import { CompressionCard } from "./CompressionCard";
import { AudioWaveform } from "@/components/AudioWaveform";
import { formatDuration, formatFileSize } from "@/types/converter";

export function CompressorView({ isActive = true }: { isActive?: boolean }) {
  const { config } = useConfig();
  const {
    cards,
    addFiles,
    updateSettings,
    setOutputName,
    startCompress,
    cancelCompress,
    removeCard,
    compressAll,
  } = useCompressor(config);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const readyCards = cards.filter((c) => c.status === "ready");
  const processingCards = cards.filter((c) =>
    c.status === "compressing" || c.status === "done" || c.status === "error" || c.status === "cancelled"
  );

  // Auto-select first ready card for settings
  const settingsCard = cards.find((c) => c.id === selectedCardId && c.status === "ready")
    || readyCards[0]
    || null;

  const handleFilesSelected = (paths: string[]) => {
    addFiles(paths);
  };

  const handleStartCompress = (cardId: string) => {
    startCompress(cardId);
    const next = readyCards.find((c) => c.id !== cardId);
    if (next) setSelectedCardId(next.id);
  };

  return (
    <div className="flex flex-col gap-0 animate-fade-in py-1">
      {/* File Input */}
      <FileInput
        onFilesSelected={handleFilesSelected}
        mediaInfo={settingsCard?.mediaInfo ?? null}
        isActive={isActive}
      />

      {/* Ready cards list (clickable to select for settings) */}
      {readyCards.length > 1 && (
        <div className="flex flex-col gap-2 mb-4">
          <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Files to compress ({readyCards.length})</p>
          <div className="flex flex-col gap-1.5">
            {readyCards.map((card) => {
              const info = card.mediaInfo;
              const isAudioOnly = info && !info.hasVideo;
              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  className={`glass-card rounded-lg px-3 py-2 flex items-center gap-3 transition-all cursor-pointer ${
                    settingsCard?.id === card.id ? "ring-1 ring-accent border-accent" : "hover:bg-hover/30"
                  }`}
                >
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-raised ring-1 ring-black/10 shrink-0 flex items-center justify-center">
                    {isAudioOnly ? (
                      <AudioWaveform seed={card.filePath + card.fileName} width={32} height={32} />
                    ) : info?.hasVideo ? (
                      <Film size={14} className="text-tertiary" />
                    ) : (
                      <Music size={14} className="text-tertiary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-medium text-primary truncate block">{card.fileName}</span>
                    {info && (
                      <span className="text-[10px] text-tertiary">
                        {info.durationSecs > 0 ? formatDuration(info.durationSecs) : ""}{info.fileSize > 0 ? ` · ${formatFileSize(info.fileSize)}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                      {card.settings.preset === "custom" ? "CUSTOM" : card.settings.preset.toUpperCase().replace("-", " ")}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCard(card.id); }}
                      className="p-1 rounded-md hover:bg-hover text-tertiary hover:text-error transition-colors"
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settings for selected ready card */}
      {settingsCard && settingsCard.mediaInfo && (
        <>
          {/* Single file header */}
          {readyCards.length === 1 && (() => {
            const info = settingsCard.mediaInfo;
            const isAudioOnly = info && !info.hasVideo;
            return (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-raised ring-1 ring-black/10 shrink-0 flex items-center justify-center">
                  {isAudioOnly ? (
                    <AudioWaveform seed={settingsCard.filePath + settingsCard.fileName} width={48} height={48} />
                  ) : info?.hasVideo ? (
                    <div className="w-full h-full bg-gradient-to-br from-hover to-active flex items-center justify-center relative">
                      <Film size={18} className="text-tertiary" />
                      {info.height && (
                        <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white font-bold text-[6px] px-0.5 rounded">{info.height}p</span>
                      )}
                    </div>
                  ) : (
                    <Music size={18} className="text-tertiary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-primary truncate block">{settingsCard.fileName}</span>
                  {info && (
                    <span className="text-[11px] text-tertiary">
                      {[
                        info.hasVideo && info.width && info.height ? `${info.width}x${info.height}` : null,
                        info.hasVideo && info.videoCodec ? info.videoCodec.toUpperCase() : null,
                        info.hasAudio && info.audioCodec ? info.audioCodec.toUpperCase() : null,
                        info.durationSecs > 0 ? formatDuration(info.durationSecs) : null,
                        info.fileSize > 0 ? formatFileSize(info.fileSize) : null,
                      ].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeCard(settingsCard.id)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] text-tertiary hover:text-error rounded-md hover:bg-error/10 transition-colors shrink-0"
                >
                  <X size={12} /> Remove
                </button>
              </div>
            );
          })()}
          <CompressionSettings
            settings={settingsCard.settings}
            mediaInfo={settingsCard.mediaInfo}
            onChange={(partial) => updateSettings(settingsCard.id, partial)}
            outputName={settingsCard.customOutputName}
            onOutputNameChange={(name) => setOutputName(settingsCard.id, name)}
          />

          <div className="flex gap-3 mb-6">
            <button
              onClick={() => handleStartCompress(settingsCard.id)}
              className="flex-1 h-11 bg-accent hover:bg-accent-hover active:scale-[0.98] text-accent-text font-semibold text-[14px] rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Minimize2 size={16} /> Start Compression
            </button>
            {readyCards.length > 1 && (
              <button
                onClick={compressAll}
                className="h-11 px-6 glass-card hover:bg-hover text-primary font-medium text-[13px] rounded-xl transition-all flex items-center gap-2"
              >
                Compress All ({readyCards.length})
              </button>
            )}
          </div>
        </>
      )}

      {/* Processing cards */}
      {processingCards.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {processingCards.map((card) => (
            <CompressionCard
              key={card.id}
              card={card}
              onStart={() => startCompress(card.id)}
              onCancel={() => cancelCompress(card.id)}
              onRemove={() => removeCard(card.id)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {cards.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center mb-4">
            <Minimize2 className="w-7 h-7 text-tertiary" />
          </div>
          <h3 className="text-[15px] font-medium text-primary mb-2">Media Compressor</h3>
          <p className="text-[13px] text-tertiary max-w-[300px]">
            Drop a video or audio file above to reduce its file size. Choose a preset or fine-tune quality, resolution, and more.
          </p>
        </div>
      )}
    </div>
  );
}
