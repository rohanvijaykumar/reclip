import { useState, useEffect, useRef } from "react";
import { Upload, Film, Music } from "lucide-react";
import { cn } from "@/lib/cn";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import type { MediaInfo } from "@/types/converter";
import { formatFileSize, formatDuration } from "@/types/converter";

interface Props {
  onFilesSelected: (paths: string[]) => void;
  mediaInfo: MediaInfo | null;
  isActive?: boolean;
}

export function FileInput({ onFilesSelected, mediaInfo, isActive = true }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);

  // Track isActive in a ref so the event listener always has the current value
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  // Use Tauri's native drag-drop events for reliable file paths
  useEffect(() => {
    const unsubs: Promise<() => void>[] = [];

    unsubs.push(
      listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
        setIsDragOver(false);
        if (!isActiveRef.current) return;
        if (event.payload.paths?.length > 0) {
          onFilesSelected(event.payload.paths);
        }
      })
    );

    unsubs.push(
      listen("tauri://drag-enter", () => {
        if (isActiveRef.current) setIsDragOver(true);
      })
    );

    unsubs.push(
      listen("tauri://drag-leave", () => setIsDragOver(false))
    );

    return () => {
      unsubs.forEach((p) => p.then((fn) => fn()));
    };
  }, [onFilesSelected]);

  const handleBrowse = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          { name: "Media Files", extensions: ["mp4", "mkv", "webm", "mov", "avi", "mp3", "flac", "wav", "ogg", "opus", "m4a", "aac", "wma", "wmv", "ts", "m4v", "3gp"] },
          { name: "Video Files", extensions: ["mp4", "mkv", "webm", "mov", "avi", "wmv", "ts", "m4v", "3gp"] },
          { name: "Audio Files", extensions: ["mp3", "flac", "wav", "ogg", "opus", "m4a", "aac", "wma"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        onFilesSelected(paths as string[]);
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="mb-6">
      <div
        onClick={handleBrowse}
        className={cn(
          "glass-card rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all border-2 border-dashed",
          isDragOver
            ? "border-accent bg-accent/5 scale-[1.01]"
            : "border-subtle hover:border-focus hover:bg-hover/30"
        )}
      >
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
          isDragOver ? "bg-accent/20" : "glass-card"
        )}>
          <Upload className={cn("w-6 h-6 transition-colors", isDragOver ? "text-accent" : "text-tertiary")} />
        </div>
        <div className="text-center">
          <p className="text-[14px] font-medium text-primary mb-1">
            {isDragOver ? "Drop files here" : "Drop files or click to browse"}
          </p>
          <p className="text-[12px] text-tertiary">
            Supports MP4, MKV, WebM, MOV, AVI, MP3, FLAC, WAV, and more
          </p>
        </div>
      </div>

      {/* File info after probing */}
      {mediaInfo && (
        <div className="mt-3 glass-card rounded-lg px-4 py-3 flex items-center gap-4 animate-fade-in">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", mediaInfo.hasVideo ? "bg-accent/15" : "bg-success/15")}>
            {mediaInfo.hasVideo ? <Film className="w-5 h-5 text-accent" /> : <Music className="w-5 h-5 text-success" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-primary truncate">{mediaInfo.fileName}</p>
            <div className="flex items-center gap-3 text-[11px] text-tertiary mt-0.5 flex-wrap">
              <span>{formatFileSize(mediaInfo.fileSize)}</span>
              {mediaInfo.durationSecs > 0 && <span>{formatDuration(mediaInfo.durationSecs)}</span>}
              {mediaInfo.width && mediaInfo.height && <span>{mediaInfo.width}x{mediaInfo.height}</span>}
              {mediaInfo.videoCodec && <span>{mediaInfo.videoCodec.toUpperCase()}</span>}
              {mediaInfo.audioCodec && <span>{mediaInfo.audioCodec.toUpperCase()}</span>}
              {mediaInfo.frameRate && <span>{Math.round(mediaInfo.frameRate)} fps</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
