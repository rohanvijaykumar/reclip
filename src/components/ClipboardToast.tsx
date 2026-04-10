import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { PlatformIcon } from "./PlatformIcon";
import type { ClipboardDetection } from "@/hooks/useClipboardWatcher";

const TOAST_DURATION = 5000;

interface Props {
  detection: ClipboardDetection;
  onGrab: () => void;
  onDismiss: () => void;
}

export function ClipboardToast({ detection, onGrab, onDismiss }: Props) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const urlRef = useRef(detection.url);

  // Reset animation when URL changes
  useEffect(() => {
    if (detection.url !== urlRef.current) {
      urlRef.current = detection.url;
      setExiting(false);
    }
  }, [detection.url]);

  // Auto-dismiss timer
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 200);
    }, TOAST_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [detection.url, onDismiss]);

  const handleGrab = () => {
    clearTimeout(timerRef.current);
    onGrab();
  };

  const handleDismiss = () => {
    clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(onDismiss, 200);
  };

  const truncatedUrl = detection.url.length > 50
    ? detection.url.slice(0, 50) + "..."
    : detection.url;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-[340px] glass-card rounded-xl shadow-lg overflow-hidden ${exiting ? "animate-toast-out" : "animate-toast-in"}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-hover flex items-center justify-center">
              <PlatformIcon platform={detection.platform} size={18} />
            </div>
            <div>
              <span className="text-[12px] font-semibold text-primary block leading-tight">
                {detection.platform} detected
              </span>
              <span className="text-[11px] text-tertiary block mt-0.5 font-mono truncate max-w-[200px]" title={detection.url}>
                {truncatedUrl}
              </span>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md hover:bg-hover text-tertiary hover:text-secondary transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        <button
          onClick={handleGrab}
          className="mt-3 w-full h-8 bg-accent hover:bg-accent-hover text-accent-text font-semibold text-[12px] rounded-lg transition-all active:scale-[0.98]"
        >
          Grab it
        </button>
      </div>

      {/* Countdown bar */}
      <div className="h-[3px] w-full bg-subtle">
        <div
          key={detection.url}
          className="h-full bg-accent/60 rounded-full"
          style={{ animation: `countdownShrink ${TOAST_DURATION}ms linear forwards` }}
        />
      </div>
    </div>
  );
}
