import { useState } from "react";
import { Zap, X } from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { useConverter } from "@/hooks/useConverter";
import { FileInput } from "./FileInput";
import { ConversionSettings } from "./ConversionSettings";
import { ConversionCard } from "./ConversionCard";

export function ConverterView() {
  const { config } = useConfig();
  const {
    cards,
    addFiles,
    updateSettings,
    setOutputName,
    startConvert,
    cancelConvert,
    removeCard,
    convertAll,
  } = useConverter(config);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const readyCards = cards.filter((c) => c.status === "ready");
  const processingCards = cards.filter((c) =>
    c.status === "converting" || c.status === "done" || c.status === "error" || c.status === "cancelled"
  );

  // Auto-select first ready card for settings
  const settingsCard = cards.find((c) => c.id === selectedCardId && c.status === "ready")
    || readyCards[0]
    || null;

  const handleFilesSelected = (paths: string[]) => {
    addFiles(paths);
  };

  const handleStartConvert = (cardId: string) => {
    startConvert(cardId);
    // Select next ready card for settings
    const next = readyCards.find((c) => c.id !== cardId);
    if (next) setSelectedCardId(next.id);
  };

  return (
    <div className="flex flex-col gap-0">
      {/* File Input */}
      <FileInput
        onFilesSelected={handleFilesSelected}
        mediaInfo={settingsCard?.mediaInfo ?? null}
      />

      {/* Ready cards list (clickable to select for settings) */}
      {readyCards.length > 1 && (
        <div className="flex flex-col gap-2 mb-4">
          <p className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Files to convert ({readyCards.length})</p>
          <div className="flex flex-col gap-1.5">
            {readyCards.map((card) => (
              <div
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                className={`glass-card rounded-lg px-3 py-2 flex items-center justify-between transition-all cursor-pointer ${
                  settingsCard?.id === card.id ? "ring-1 ring-accent border-accent" : "hover:bg-hover/30"
                }`}
              >
                <span className="text-[12px] font-medium text-primary truncate">{card.fileName}</span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                    {card.settings.outputFormat.toUpperCase()}
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
            ))}
          </div>
        </div>
      )}

      {/* Settings for selected ready card */}
      {settingsCard && settingsCard.mediaInfo && (
        <>
          {/* Single file header with remove option */}
          {readyCards.length === 1 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-primary truncate">{settingsCard.fileName}</span>
              <button
                onClick={() => removeCard(settingsCard.id)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-tertiary hover:text-error rounded-md hover:bg-error/10 transition-colors"
              >
                <X size={12} /> Remove
              </button>
            </div>
          )}
          <ConversionSettings
            settings={settingsCard.settings}
            mediaInfo={settingsCard.mediaInfo}
            onChange={(partial) => updateSettings(settingsCard.id, partial)}
            outputName={settingsCard.customOutputName}
            onOutputNameChange={(name) => setOutputName(settingsCard.id, name)}
          />

          <div className="flex gap-3 mb-6">
            <button
              onClick={() => handleStartConvert(settingsCard.id)}
              className="flex-1 h-11 bg-accent hover:bg-accent-hover active:scale-[0.98] text-accent-text font-semibold text-[14px] rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Zap size={16} /> Start Conversion
            </button>
            {readyCards.length > 1 && (
              <button
                onClick={convertAll}
                className="h-11 px-6 glass-card hover:bg-hover text-primary font-medium text-[13px] rounded-xl transition-all flex items-center gap-2"
              >
                Convert All ({readyCards.length})
              </button>
            )}
          </div>
        </>
      )}

      {/* Processing cards */}
      {processingCards.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {processingCards.map((card) => (
            <ConversionCard
              key={card.id}
              card={card}
              onStart={() => startConvert(card.id)}
              onCancel={() => cancelConvert(card.id)}
              onRemove={() => removeCard(card.id)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {cards.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center mb-4">
            <Zap className="w-7 h-7 text-tertiary" />
          </div>
          <h3 className="text-[15px] font-medium text-primary mb-2">Media Converter</h3>
          <p className="text-[13px] text-tertiary max-w-[300px]">
            Drop a video or audio file above to convert between formats, change quality, trim, extract audio, and more.
          </p>
        </div>
      )}
    </div>
  );
}
