import { useState } from "react";
import { Loader2, Play, Music, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { VIDEO_FORMATS, AUDIO_FORMATS } from "@/types";
import type { FormatCategory, OutputFormat } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FluidTabs } from "@/components/ui/fluid-tabs";

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
  const formats = category === "video" ? VIDEO_FORMATS : AUDIO_FORMATS;

  return (
    <div className="mb-6 relative group animate-fade-in">
      {/* Animated glowing backdrop */}
      <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-accent/10 to-transparent rounded-[20px] blur-lg opacity-0 transition duration-700 group-hover:opacity-100 group-focus-within:opacity-100 group-focus-within:duration-200" />
      
      <div className="relative flex flex-col bg-raised/40 backdrop-blur-3xl rounded-[18px] ring-1 ring-subtle focus-within:ring-accent/50 shadow-sm transition-all duration-300 overflow-visible group-focus-within:shadow-xl group-focus-within:bg-raised/60">
        
        {/* Textarea */}
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
          className="w-full bg-transparent p-5 pb-3 text-[15px] leading-relaxed text-primary placeholder:text-tertiary focus:outline-none resize-none font-medium custom-scrollbar rounded-t-[18px]"
          rows={3}
          spellCheck={false}
        />

        {/* Controls bar */}
        <div className="flex justify-between items-center px-3 py-3 border-t border-subtle/50 relative z-20">
          <p className="text-[11px] text-tertiary font-medium pl-2 hidden sm:block">Space or newline separated</p>
          
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {/* Category Toggle (Video / Audio) */}
            <FluidTabs
              layoutId="category-pill"
              className="!p-0.5 !gap-0.5"
              tabs={[
                { id: "video", label: "Video", icon: <Play size={13} fill="currentColor" />, color: "#E85D2A" },
                { id: "audio", label: "Audio", icon: <Music size={13} fill="currentColor" />, color: "#3B82F6" },
              ]}
              defaultActive={category}
              onChange={(id) => {
                onCategoryChange(id as FormatCategory);
                onOutputFormatChange(id === "video" ? "mp4" : "mp3");
              }}
            />

            <Select
              value={outputFormat}
              onValueChange={(val) => { if (val) onOutputFormatChange(val as OutputFormat); }}
            >
              <SelectTrigger className="h-9 px-3.5 bg-hover/50 ring-1 ring-subtle rounded-xl text-[12px] font-bold text-secondary flex items-center gap-1.5 hover:bg-hover hover:text-primary transition-all shadow-inner w-auto">
                <SelectValue placeholder="Format">
                  {formats.find(f => f.id === outputFormat)?.label ?? outputFormat.toUpperCase()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {formats.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Fetch Button */}
            <button
              onClick={onFetch}
              disabled={!urls.trim() || isFetching}
              className="group/fetch h-9 px-6 bg-accent hover:bg-accent-hover text-accent-text disabled:bg-hover disabled:text-tertiary font-bold text-[13px] tracking-wide rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none shadow-md hover:shadow-lg hover:shadow-accent/20 active:scale-[0.97]"
            >
              {isFetching ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Fetching
                </span>
              ) : (
                <span className="relative flex items-center justify-center">
                  <span className="transition-transform duration-300">Fetch</span>
                  <span className="absolute left-[calc(100%+6px)] opacity-0 group-hover/fetch:opacity-100 transition-all duration-300 group-hover/fetch:translate-x-0 -translate-x-1">
                    →
                  </span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
