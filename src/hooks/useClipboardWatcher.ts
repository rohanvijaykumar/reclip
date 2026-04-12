import { useState, useEffect, useRef, useCallback } from "react";
import { detectPlatformFromUrl } from "@/lib/utils";

export interface ClipboardDetection {
  url: string;
  platform: string;
}

function detectPlatform(text: string): ClipboardDetection | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("http")) return null;
  if (/\s/.test(trimmed)) return null;

  const platform = detectPlatformFromUrl(trimmed);
  if (platform) return { url: trimmed, platform };
  return null;
}

export function useClipboardWatcher(enabled: boolean, currentTextareaValue: string) {
  const [detection, setDetection] = useState<ClipboardDetection | null>(null);
  const lastClipRef = useRef<string>("");
  const dismissedUrlRef = useRef<string>("");

  const dismiss = useCallback(() => {
    if (detection) {
      dismissedUrlRef.current = detection.url;
    }
    setDetection(null);
  }, [detection]);

  const grab = useCallback(() => {
    const url = detection?.url ?? null;
    setDetection(null);
    return url;
  }, [detection]);

  useEffect(() => {
    if (!enabled) {
      setDetection(null);
      return;
    }

    const poll = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text || text === lastClipRef.current) return;
        lastClipRef.current = text;

        const result = detectPlatform(text);
        if (!result) return;
        if (currentTextareaValue.includes(result.url)) return;
        if (result.url === dismissedUrlRef.current) return;

        setDetection(result);
      } catch {
        // Clipboard read can fail if window not focused
      }
    };

    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [enabled, currentTextareaValue]);

  return { detection, dismiss, grab };
}
