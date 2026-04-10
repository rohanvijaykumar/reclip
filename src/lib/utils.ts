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
