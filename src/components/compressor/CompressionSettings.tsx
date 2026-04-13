import { useState, useMemo } from "react";
import { ChevronDown, Settings2, HardDrive, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { LabeledSelect, ChipGroup } from "@/components/converter/SettingControls";
import type { CompressionSettings as Settings, CompressionPreset, AudioCompressionPreset } from "@/types/compressor";
import type { MediaInfo } from "@/types/converter";
import {
  VIDEO_COMPRESSION_PRESETS, AUDIO_COMPRESSION_PRESETS,
  VIDEO_OUTPUT_FORMATS, AUDIO_OUTPUT_FORMATS,
  COMPRESS_RESOLUTIONS, COMPRESS_FRAME_RATES,
  AUDIO_MODES, AUDIO_BITRATES, ENCODER_SPEEDS,
  AUDIO_ONLY_FORMATS,
  applyVideoPreset, applyAudioPreset, estimateCompressedSize,
} from "@/types/compressor";
import { formatFileSize } from "@/types/converter";

interface Props {
  settings: Settings;
  mediaInfo: MediaInfo | null;
  onChange: (partial: Partial<Settings>) => void;
  outputName: string;
  onOutputNameChange: (name: string) => void;
}

export function CompressionSettings({ settings, mediaInfo, onChange, outputName, onOutputNameChange }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isAudioOnly = mediaInfo ? !mediaInfo.hasVideo : false;
  const isAudioOutput = AUDIO_ONLY_FORMATS.includes(settings.outputFormat);
  const isTwoPass = settings.targetSizeMb != null;

  const handleVideoPresetChange = (presetId: string) => {
    const presetValues = applyVideoPreset(presetId as CompressionPreset, mediaInfo);
    onChange(presetValues);
  };

  const handleAudioPresetChange = (presetId: string) => {
    const presetValues = applyAudioPreset(presetId as AudioCompressionPreset);
    onChange(presetValues);
  };

  const handleSettingChange = (partial: Partial<Settings>) => {
    if (settings.preset !== "custom" && !("preset" in partial)) {
      onChange({ ...partial, preset: "custom" });
    } else {
      onChange(partial);
    }
  };

  const handleOutputFormatChange = (fmt: string) => {
    onChange({ outputFormat: fmt });
  };

  // Determine which format options and presets to show
  const formatOptions = isAudioOnly ? AUDIO_OUTPUT_FORMATS : VIDEO_OUTPUT_FORMATS;
  const presets = isAudioOnly ? AUDIO_COMPRESSION_PRESETS : VIDEO_COMPRESSION_PRESETS;
  const handlePresetChange = isAudioOnly ? handleAudioPresetChange : handleVideoPresetChange;

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* Output Filename + Format */}
      <div className="glass-card rounded-xl px-4 py-3 space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Output</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={outputName}
              onChange={(e) => onOutputNameChange(e.target.value)}
              placeholder="Enter filename..."
              className="flex-1 glass-card rounded-lg px-3 py-2 text-[13px] text-primary font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <span className="text-[12px] text-tertiary font-mono">.{settings.outputFormat}</span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {formatOptions.map((f) => (
            <button
              key={f.id}
              onClick={() => handleOutputFormatChange(f.id)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all",
                f.id === settings.outputFormat
                  ? "bg-accent text-accent-text"
                  : "glass-card text-secondary hover:text-primary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Selector */}
      <div className="glass-card rounded-xl px-4 py-3">
        <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider block mb-2">Preset</label>
        <div className="flex gap-1.5 flex-wrap">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p.id)}
              className={cn(
                "px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all flex flex-col items-start",
                p.id === settings.preset
                  ? "bg-accent text-accent-text"
                  : "glass-card text-secondary hover:text-primary"
              )}
              title={p.description}
            >
              <span>{p.label}</span>
              <span className={cn(
                "text-[9px] mt-0.5",
                p.id === settings.preset ? "text-accent-text/70" : "text-tertiary"
              )}>{p.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── VIDEO-SPECIFIC SETTINGS ─── */}
      {!isAudioOnly && !isAudioOutput && (
        <>
          {/* Target File Size (video only, email/custom) */}
          {(settings.preset === "email-friendly" || settings.preset === "custom") && (
            <div className="glass-card rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTwoPass}
                    onChange={(e) =>
                      handleSettingChange({ targetSizeMb: e.target.checked ? 25 : null })
                    }
                    className="w-3.5 h-3.5 rounded accent-accent"
                  />
                  <span className="text-[12px] font-medium text-primary">Target file size</span>
                </label>
                {isTwoPass && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={settings.targetSizeMb ?? 25}
                      onChange={(e) =>
                        handleSettingChange({ targetSizeMb: Math.max(1, Number(e.target.value)) })
                      }
                      min={1}
                      className="w-16 glass-card rounded-lg px-2 py-1 text-[13px] text-primary font-mono text-center focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <span className="text-[12px] text-tertiary">MB</span>
                  </div>
                )}
              </div>
              {isTwoPass && (
                <div className="flex items-start gap-1.5 mt-2">
                  <Info size={12} className="text-tertiary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-tertiary">
                    Two-pass encode using CPU for accurate size targeting.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Video Quality Slider (CRF) */}
          {!isTwoPass && (
            <div className="glass-card rounded-xl px-4 py-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Video Quality</label>
                  <span className="text-[12px] font-mono text-secondary">CRF {settings.quality}</span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={40}
                  step={1}
                  value={settings.quality}
                  onChange={(e) => handleSettingChange({ quality: Number(e.target.value) })}
                  className="w-full h-1.5 bg-progress-track rounded-full appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between">
                  <span className="text-[10px] text-tertiary">Visually Lossless</span>
                  <span className="text-[10px] text-tertiary">Tiny File</span>
                </div>
              </div>
            </div>
          )}

          {/* Video Advanced Settings */}
          <div className="glass-card rounded-xl overflow-hidden">
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-hover/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings2 size={14} className="text-secondary" />
                <span className="text-[13px] font-medium text-primary">Advanced</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-tertiary">
                  {[
                    settings.resolution !== "original" ? settings.resolution.split("x")[1] + "p" : null,
                    settings.frameRate !== "original" ? settings.frameRate + "fps" : null,
                    settings.audioMode === "strip" ? "No audio" : null,
                  ].filter(Boolean).join(", ") || "Defaults"}
                </span>
                <ChevronDown
                  size={14}
                  className={cn("text-tertiary transition-transform", advancedOpen && "rotate-180")}
                />
              </div>
            </button>
            {advancedOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-subtle animate-fade-in space-y-4">
                <ChipGroup
                  label="Resolution"
                  value={settings.resolution}
                  options={COMPRESS_RESOLUTIONS}
                  onChange={(v) => handleSettingChange({ resolution: v })}
                />
                <ChipGroup
                  label="Frame Rate"
                  value={settings.frameRate}
                  options={COMPRESS_FRAME_RATES}
                  onChange={(v) => handleSettingChange({ frameRate: v })}
                />
                <ChipGroup
                  label="Audio Track"
                  value={settings.audioMode}
                  options={AUDIO_MODES}
                  onChange={(v) => handleSettingChange({ audioMode: v as Settings["audioMode"] })}
                />
                <LabeledSelect
                  label="Encoder Speed"
                  value={settings.encoderSpeed}
                  options={ENCODER_SPEEDS}
                  onChange={(v) => handleSettingChange({ encoderSpeed: v })}
                />
                <ToggleRow
                  label="Hardware Acceleration"
                  sublabel={isTwoPass ? "Disabled for target size mode" : undefined}
                  checked={settings.hwAccel === "auto" && !isTwoPass}
                  disabled={isTwoPass}
                  onChange={(v) => handleSettingChange({ hwAccel: v ? "auto" : "software" })}
                />
                <ToggleRow
                  label="Strip Metadata"
                  checked={settings.stripMetadata}
                  onChange={(v) => handleSettingChange({ stripMetadata: v })}
                />
                <ToggleRow
                  label="Strip Subtitles"
                  checked={settings.stripSubtitles}
                  onChange={(v) => handleSettingChange({ stripSubtitles: v })}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── AUDIO-SPECIFIC SETTINGS ─── */}
      {(isAudioOnly || isAudioOutput) && (
        <>
          {/* Audio Bitrate */}
          <div className="glass-card rounded-xl px-4 py-3">
            <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider block mb-2">Audio Bitrate</label>
            <div className="flex gap-1.5 flex-wrap">
              {AUDIO_BITRATES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSettingChange({ audioBitrate: b.id })}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all",
                    b.id === settings.audioBitrate
                      ? "bg-accent text-accent-text"
                      : "glass-card text-secondary hover:text-primary"
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {settings.outputFormat === "flac" && (
              <p className="text-[10px] text-tertiary mt-2">FLAC is lossless — bitrate setting is ignored.</p>
            )}
            {settings.outputFormat === "wav" && (
              <p className="text-[10px] text-tertiary mt-2">WAV is uncompressed — bitrate setting is ignored.</p>
            )}
          </div>

          {/* Audio advanced: just metadata */}
          <div className="glass-card rounded-xl px-4 py-3">
            <ToggleRow
              label="Strip Metadata"
              checked={settings.stripMetadata}
              onChange={(v) => handleSettingChange({ stripMetadata: v })}
            />
          </div>
        </>
      )}

      {/* Size Estimate */}
      <SizeEstimate settings={settings} mediaInfo={mediaInfo} />
    </div>
  );
}

// ─── Toggle row ──────────────────────────────────────────────────

function ToggleRow({ label, sublabel, checked, disabled, onChange }: {
  label: string;
  sublabel?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-[11px] font-medium text-tertiary uppercase tracking-wider">{label}</span>
        {sublabel && <span className="text-[10px] text-tertiary">{sublabel}</span>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-hover rounded-full peer peer-checked:bg-accent transition-colors peer-disabled:opacity-40">
          <div className={cn(
            "w-4 h-4 bg-primary rounded-full transition-transform mt-0.5",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )} />
        </div>
      </label>
    </div>
  );
}

// ─── Size estimate ───────────────────────────────────────────────

function SizeEstimate({ settings, mediaInfo }: { settings: Settings; mediaInfo: MediaInfo | null }) {
  const estimate = useMemo(() => estimateCompressedSize(settings, mediaInfo), [settings, mediaInfo]);

  if (!estimate || estimate <= 0 || !mediaInfo || mediaInfo.fileSize <= 0) return null;

  const originalSize = mediaInfo.fileSize;
  const reduction = Math.max(0, ((1 - estimate / originalSize) * 100));
  const isLarger = estimate >= originalSize;

  return (
    <div className="glass-card rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <HardDrive size={14} className="text-tertiary shrink-0" />
        <span className="text-[12px] text-secondary">
          {formatFileSize(originalSize)}
        </span>
        <span className="text-[12px] text-tertiary">→</span>
        <span className={cn("text-[12px] font-semibold", isLarger ? "text-warning" : "text-success")}>
          ~{formatFileSize(estimate)}
        </span>
        {!isLarger && (
          <span className="text-[10px] text-success ml-auto">
            {Math.round(reduction)}% smaller
          </span>
        )}
        {isLarger && (
          <span className="text-[10px] text-warning ml-auto">
            May increase size
          </span>
        )}
      </div>
      <div className="h-1.5 w-full bg-progress-track rounded-full overflow-hidden ring-1 ring-inset ring-white/5">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(100, (estimate / originalSize) * 100)}%`,
            backgroundColor: isLarger ? "var(--theme-warning)" : "var(--theme-success)",
          }}
        />
      </div>
    </div>
  );
}
