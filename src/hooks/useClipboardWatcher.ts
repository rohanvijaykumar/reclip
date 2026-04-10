import { useState, useEffect, useRef, useCallback } from "react";

const PLATFORM_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "YouTube", pattern: /(?:youtube\.com\/(?:watch|shorts|live|embed)|youtu\.be\/)/i },
  { name: "TikTok", pattern: /tiktok\.com\//i },
  { name: "Instagram", pattern: /instagram\.com\/(?:p|reel|tv)\//i },
  { name: "X", pattern: /(?:twitter\.com|x\.com)\/\w+\/status\//i },
  { name: "Reddit", pattern: /(?:reddit\.com|redd\.it)\//i },
  { name: "SoundCloud", pattern: /soundcloud\.com\//i },
  { name: "Vimeo", pattern: /vimeo\.com\/\d/i },
  { name: "Facebook", pattern: /(?:facebook\.com|fb\.watch)\/.*(?:video|watch|reel)/i },
  { name: "Twitch", pattern: /(?:twitch\.tv\/(?:videos\/|.*\/clip\/|\w+)|clips\.twitch\.tv\/)/i },
  { name: "Dailymotion", pattern: /dailymotion\.com\/video\//i },
  { name: "Bilibili", pattern: /bilibili\.com\/video\//i },
  { name: "Pinterest", pattern: /pinterest\.com\/pin\//i },
];

export interface ClipboardDetection {
  url: string;
  platform: string;
}

function detectPlatform(text: string): ClipboardDetection | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("http")) return null;
  // Must be a single URL (no whitespace)
  if (/\s/.test(trimmed)) return null;

  for (const { name, pattern } of PLATFORM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { url: trimmed, platform: name };
    }
  }
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
        // Don't show if already in the textarea
        if (currentTextareaValue.includes(result.url)) return;
        // Don't show if user already dismissed this exact URL
        if (result.url === dismissedUrlRef.current) return;

        setDetection(result);
      } catch {
        // Clipboard read can fail if window not focused — ignore
      }
    };

    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [enabled, currentTextareaValue]);

  return { detection, dismiss, grab };
}
