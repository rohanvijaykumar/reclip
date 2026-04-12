export function parseUrls(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\s,]+/)
        .map((u) => u.trim())
        .filter((u) => u.startsWith("http"))
    ),
  ];
}

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

export function detectPlatformFromUrl(url: string): string | null {
  for (const { name, pattern } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return name;
  }
  return null;
}

export { PLATFORM_PATTERNS };

export function fmtDur(s: number | null | undefined): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const PLAYLIST_PATTERNS = [
  /youtube\.com\/playlist\?/i,
  /youtube\.com\/.*[?&]list=/i,
  /youtu\.be\/.*[?&]list=/i,
];

export function looksLikePlaylist(url: string): boolean {
  return PLAYLIST_PATTERNS.some((p) => p.test(url));
}

const PERMANENT_ERROR_PATTERNS = [
  "Unsupported URL",
  "Video unavailable",
  "Private video",
  "This video has been removed",
  "This video is no longer available",
  "copyright",
  "geo",
  "HTTP Error 404",
  "is not a valid URL",
  "blocked",
  "account associated",
  "Sign in to confirm your age",
];

export function isPermanentError(err: string): boolean {
  return PERMANENT_ERROR_PATTERNS.some((p) => err.includes(p));
}

export function fmtSize(bytes: number | null | undefined): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function friendlyError(err: string): string {
  if (err.includes("Unsupported URL")) return "This URL is not supported";
  if (err.includes("Video unavailable")) return "Video is unavailable or private";
  if (err.includes("Private video")) return "This video is private";
  if (err.includes("HTTP Error 403")) return "Access denied by the platform";
  if (err.includes("HTTP Error 404")) return "Video not found";
  if (err.includes("copyright")) return "Video blocked due to copyright";
  if (err.includes("geo")) return "Video not available in your region";
  if (err.includes("timed out") || err.includes("Timed out")) return "Request timed out — try again";
  if (err.includes("network") || err.includes("Network")) return "Network error — check your connection";
  return err.length > 80 ? err.slice(0, 80) + "..." : err;
}
