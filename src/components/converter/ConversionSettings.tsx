import { useState, useMemo } from "react";
import { ChevronDown, Video, AudioLines, Scissors, FileOutput, HardDrive } from "lucide-react";
import { cn } from "@/lib/cn";
import { LabeledSelect, LabeledSlider, TimeInput, ChipGroup } from "./SettingControls";
import type { ConversionSettings as Settings, MediaInfo } from "@/types/converter";
import {
  VIDEO_CODECS, AUDIO_CODECS, RESOLUTIONS, FRAME_RATES,
  AUDIO_BITRATES, SAMPLE_RATES, CHANNEL_OPTIONS,
  OUTPUT_FORMATS, formatDuration,
} from "@/types/converter";

interface Props {
  settings: Settings;
  mediaInfo: MediaInfo | null;
  onChange: (partial: Partial<Settings>) => void;
  outputName: string;
  onOutputNameChange: (name: string) => void;
}

const AUDIO_ONLY_FORMATS = ["mp3", "flac", "wav", "ogg", "opus", "m4a", "aac"];

/** Auto-adjust codecs to be compatible with the selected output container */
function getCompatibleDefaults(format: string): Partial<Settings> {
  if (AUDIO_ONLY_FORMATS.includes(format)) {
    const audioCodecMap: Record<string, string> = {
      mp3: "mp3", flac: "flac", wav: "flac", ogg: "vorbis", opus: "opus", m4a: "aac", aac: "aac",
    };
    return { videoCodec: "none", audioCodec: audioCodecMap[format] || "aac" };
  }
  if (format === "webm") {
    return { videoCodec: "vp9", audioCodec: "opus" };
  }
  return {};
}

export function ConversionSettings({ settings, mediaInfo, onChange, outputName, onOutputNameChange }: Props) {
  const [openSection, setOpenSection] = useState<string | null>("output");
  const isAudioOutput = AUDIO_ONLY_FORMATS.includes(settings.outputFormat);
  const hasVideo = !isAudioOutput && (mediaInfo?.hasVideo ?? true);
  const hasAudio = mediaInfo?.hasAudio ?? true;
  const isVideoCopyOrNone = settings.videoCodec === "copy" || settings.videoCodec === "none";
  const isAudioCopyOrNone = settings.audioCodec === "copy" || settings.audioCodec === "none";

  const handleFormatChange = (fmt: string) => {
    const compat = getCompatibleDefaults(fmt);
    onChange({ outputFormat: fmt, ...compat });
  };

  const toggle = (id: string) => setOpenSection(openSection === id ? null : id);

  return (
    <div className="flex flex-col gap-2 mb-6">
      {/* Output Format */}
      <Section
        id="output"
        icon={<FileOutput size={14} />}
        title="Output Format"
        summary={settings.outputFormat.toUpperCase()}
        open={openSection === "output"}
        onToggle={() => toggle("output")}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Output Filename</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={outputName}
                onChange={(e) => onOutputNameChange(e.target.value)}
                placeholder="Enter filename..."
                className="flex-1 bg-raised/40 backdrop-blur-md rounded-xl px-3.5 py-2 text-[13px] text-primary font-mono ring-1 ring-subtle focus:outline-none focus:ring-accent/50 focus:bg-raised/70 transition-all placeholder:text-tertiary/50"
              />
              <span className="text-[12px] text-tertiary font-mono">.{settings.outputFormat}</span>
            </div>
          </div>
          <ChipGroup
            label="Container"
            value={settings.outputFormat}
            options={OUTPUT_FORMATS}
            onChange={handleFormatChange}
          />
        </div>
      </Section>

      {/* Video Settings */}
      {hasVideo && (
        <Section
          id="video"
          icon={<Video size={14} />}
          title="Video"
          summary={VIDEO_CODECS.find((c) => c.id === settings.videoCodec)?.label || "—"}
          open={openSection === "video"}
          onToggle={() => toggle("video")}
        >
          <div className="grid grid-cols-2 gap-4">
            <LabeledSelect label="Codec" value={settings.videoCodec || "h264"} options={VIDEO_CODECS} onChange={(v: string) => onChange({ videoCodec: v })} />
            <LabeledSelect label="Resolution" value={settings.resolution || "original"} options={RESOLUTIONS} onChange={(v: string) => onChange({ resolution: v })} disabled={isVideoCopyOrNone} />
            <LabeledSelect label="Frame Rate" value={settings.frameRate || "original"} options={FRAME_RATES} onChange={(v: string) => onChange({ frameRate: v })} disabled={isVideoCopyOrNone} />
          </div>
          {!isVideoCopyOrNone && (
            <div className="mt-4 space-y-4">
              <ChipGroup
                label="Bitrate Mode"
                value={settings.bitrateMode || "crf"}
                options={[
                  { id: "crf", label: "Quality (CRF)" },
                  { id: "cbr", label: "Constant Bitrate" },
                  { id: "vbr", label: "Variable Bitrate" },
                ]}
                onChange={(v: string) => onChange({ bitrateMode: v })}
              />
              {settings.bitrateMode === "crf" && (
                <LabeledSlider label="Quality (CRF)" value={settings.crfValue ?? 23} min={0} max={51} onChange={(v: number) => onChange({ crfValue: v })} />
              )}
              {(settings.bitrateMode === "cbr" || settings.bitrateMode === "vbr") && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Video Bitrate</label>
                  <input
                    type="text"
                    value={settings.videoBitrate || ""}
                    onChange={(e) => onChange({ videoBitrate: e.target.value })}
                    placeholder="e.g., 5000k"
                    className="glass-card rounded-lg px-3 py-2 text-[13px] text-primary font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {/* Audio Settings */}
      {hasAudio && (
        <Section
          id="audio"
          icon={<AudioLines size={14} />}
          title="Audio"
          summary={AUDIO_CODECS.find((c) => c.id === settings.audioCodec)?.label || "—"}
          open={openSection === "audio"}
          onToggle={() => toggle("audio")}
        >
          <div className="grid grid-cols-2 gap-4">
            <LabeledSelect label="Codec" value={settings.audioCodec || "aac"} options={AUDIO_CODECS} onChange={(v: string) => onChange({ audioCodec: v })} />
            <LabeledSelect label="Bitrate" value={settings.audioBitrate || "192k"} options={AUDIO_BITRATES} onChange={(v: string) => onChange({ audioBitrate: v })} disabled={isAudioCopyOrNone || settings.audioCodec === "flac"} />
            <LabeledSelect label="Sample Rate" value={settings.sampleRate || "original"} options={SAMPLE_RATES} onChange={(v: string) => onChange({ sampleRate: v })} disabled={isAudioCopyOrNone} />
            <LabeledSelect label="Channels" value={settings.channels || "original"} options={CHANNEL_OPTIONS} onChange={(v: string) => onChange({ channels: v })} disabled={isAudioCopyOrNone} />
          </div>
          {!isAudioCopyOrNone && (
            <div className="mt-4">
              <LabeledSlider label="Volume" value={settings.volume ?? 0} min={-20} max={20} step={0.5} unit="dB" onChange={(v: number) => onChange({ volume: v })} />
            </div>
          )}
        </Section>
      )}

      {/* Trim */}
      <Section
        id="trim"
        icon={<Scissors size={14} />}
        title="Trim"
        summary={settings.startTime || settings.endTime ? `${settings.startTime || "start"} → ${settings.endTime || "end"}` : "Full duration"}
        open={openSection === "trim"}
        onToggle={() => toggle("trim")}
      >
        <div className="grid grid-cols-2 gap-4">
          <TimeInput label="Start Time" value={settings.startTime || ""} onChange={(v) => onChange({ startTime: v || null })} />
          <TimeInput label="End Time" value={settings.endTime || ""} onChange={(v) => onChange({ endTime: v || null })} />
        </div>
        {mediaInfo && mediaInfo.durationSecs > 0 && (
          <p className="text-[11px] text-tertiary mt-2">Total duration: {formatDuration(mediaInfo.durationSecs)}</p>
        )}
      </Section>

      {/* Estimated output size */}
      <SizeEstimate settings={settings} mediaInfo={mediaInfo} />
    </div>
  );
}

function parseTimeToSecs(t: string): number {
  const parts = t.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function SizeEstimate({ settings, mediaInfo }: { settings: Settings; mediaInfo: MediaInfo | null }) {
  const estimate = useMemo(() => {
    if (!mediaInfo || mediaInfo.fileSize <= 0 || mediaInfo.durationSecs <= 0) return null;

    // Effective duration after trim
    const startSecs = settings.startTime ? parseTimeToSecs(settings.startTime) : 0;
    const endSecs = settings.endTime ? parseTimeToSecs(settings.endTime) : mediaInfo.durationSecs;
    const duration = Math.max(0, Math.min(endSecs, mediaInfo.durationSecs) - startSecs);
    if (duration <= 0) return null;
    const durationRatio = duration / mediaInfo.durationSecs;

    // If copy mode, just scale by duration
    if (settings.videoCodec === "copy" && settings.audioCodec === "copy") {
      return mediaInfo.fileSize * durationRatio;
    }

    // Resolution scaling
    let resRatio = 1;
    if (settings.resolution && settings.resolution !== "original" && mediaInfo.width && mediaInfo.height) {
      const [tw, th] = settings.resolution.split("x").map(Number);
      const srcPixels = mediaInfo.width * mediaInfo.height;
      const tgtPixels = tw * th;
      if (srcPixels > 0 && tgtPixels > 0) resRatio = tgtPixels / srcPixels;
    }

    // CRF quality scaling (rough: CRF 23 = 1x, CRF 18 = ~2x, CRF 28 = ~0.5x)
    let qualityFactor = 1;
    if (settings.bitrateMode === "crf" && settings.crfValue != null) {
      qualityFactor = Math.pow(2, (23 - settings.crfValue) / 6);
    }

    // Explicit bitrate override
    if ((settings.bitrateMode === "cbr" || settings.bitrateMode === "vbr") && settings.videoBitrate) {
      const kbps = parseInt(settings.videoBitrate.replace(/[^0-9]/g, ""));
      if (kbps > 0) {
        const audioBps = settings.audioCodec !== "none" ? (parseInt(settings.audioBitrate?.replace(/[^0-9]/g, "") || "192") * 1000 / 8) : 0;
        return (kbps * 1000 / 8 + audioBps) * duration;
      }
    }

    // Audio-only output
    if (settings.videoCodec === "none" || AUDIO_ONLY_FORMATS.includes(settings.outputFormat)) {
      const audioBitrate = parseInt(settings.audioBitrate?.replace(/[^0-9]/g, "") || "192");
      return (audioBitrate * 1000 / 8) * duration;
    }

    return mediaInfo.fileSize * durationRatio * resRatio * qualityFactor;
  }, [settings, mediaInfo]);

  if (!estimate || estimate <= 0) return null;

  const fmt = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-2">
      <HardDrive size={14} className="text-tertiary shrink-0" />
      <span className="text-[12px] text-secondary">Estimated output:</span>
      <span className="text-[12px] font-semibold text-primary">{fmt(estimate)}</span>
      {mediaInfo && mediaInfo.fileSize > 0 && (
        <span className="text-[10px] text-tertiary ml-auto">
          Source: {fmt(mediaInfo.fileSize)}
        </span>
      )}
    </div>
  );
}

function Section({
  id, icon, title, summary, open, onToggle, children,
}: {
  id: string; icon: React.ReactNode; title: string; summary: string;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-hover/30 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-secondary">{icon}</span>
          <span className="text-[13px] font-medium text-primary">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-tertiary">{summary}</span>
          <ChevronDown size={14} className={cn("text-tertiary transition-transform", open && "rotate-180")} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-subtle animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
