import { useState } from "react";
import { Loader2, Play, Music, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { VIDEO_FORMATS, AUDIO_FORMATS } from "@/types";
import type { FormatCategory, OutputFormat } from "@/types";

interface Props {
  urls: string;
  onUrlsChange: (val: string) => void;
  category: FormatCategory;
  outputFormat: OutputFormat;
  onCategoryChange: (c: FormatCategory) => void;
  onOutputFormatChange: (f: OutputFormat) => void;
  onFetch: () => void;
  isFetching: boolean;
}

export function InputArea({
  urls, onUrlsChange, category, outputFormat,
  onCategoryChange, onOutputFormatChange, onFetch, isFetching,
}: Props) {
  const [showFormats, setShowFormats] = useState(false);
  const formats = category === "video" ? VIDEO_FORMATS : AUDIO_FORMATS;
  const currentLabel = formats.find((f) => f.id === outputFormat)?.label ?? outputFormat.toUpperCase();

  return (
    <div className="mb-8">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-accent/0 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
        <div className="relative">
          {/* Textarea */}
          <div className="glass-card rounded-t-xl focus-within:ring-1 focus-within:ring-accent transition-all overflow-hidden border-b-0">
            <textarea
              value={urls}
              onChange={(e) => onUrlsChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onFetch();
                }
              }}
              placeholder="Paste URLs from YouTube, Twitter, Instagram..."
              className="w-full bg-transparent p-4 text-[14px] text-primary placeholder:text-tertiary focus:outline-none resize-none font-mono"
              rows={3}
              spellCheck={false}
            />
          </div>

          {/* Controls bar — outside overflow-hidden so dropdown isn't clipped */}
          <div className="flex justify-between items-center glass-card rounded-b-xl border-t-0 px-4 py-3 relative z-20">
            <p className="text-[11px] text-tertiary">Space or newline separated</p>

            <div className="flex items-center gap-3">
              {/* Category Toggle (Video / Audio) */}
              <div className="flex bg-base border border-subtle rounded-lg p-1">
                <button
                  onClick={() => {
                    onCategoryChange("video");
                    onOutputFormatChange("mp4");
                    setShowFormats(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                    category === "video"
                      ? "bg-hover text-primary shadow-sm"
                      : "text-tertiary hover:text-secondary"
                  )}
                >
                  <Play size={14} /> Video
                </button>
                <button
                  onClick={() => {
                    onCategoryChange("audio");
                    onOutputFormatChange("mp3");
                    setShowFormats(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                    category === "audio"
                      ? "bg-hover text-primary shadow-sm"
                      : "text-tertiary hover:text-secondary"
                  )}
                >
                  <Music size={14} /> Audio
                </button>
              </div>

              {/* Output Format Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFormats(!showFormats)}
                  className="h-9 px-3 bg-base border border-subtle rounded-lg text-[12px] font-semibold text-primary flex items-center gap-1.5 hover:bg-hover transition-all"
                >
                  {currentLabel}
                  <ChevronDown size={12} className={cn("text-tertiary transition-transform", showFormats && "rotate-180")} />
                </button>

                {showFormats && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFormats(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-raised border border-subtle rounded-lg shadow-xl p-1 min-w-[120px] animate-fade-in">
                      {formats.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            onOutputFormatChange(f.id);
                            setShowFormats(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors",
                            f.id === outputFormat
                              ? "bg-accent text-accent-text"
                              : "text-secondary hover:text-primary hover:bg-hover"
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Fetch Button */}
              <button
                onClick={onFetch}
                disabled={!urls.trim() || isFetching}
                className="h-9 px-5 bg-accent hover:bg-accent-hover text-accent-text active:scale-[0.98] disabled:bg-hover disabled:text-tertiary font-semibold text-[13px] rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm"
              >
                {isFetching ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching...
                  </span>
                ) : (
                  "Fetch Media"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
