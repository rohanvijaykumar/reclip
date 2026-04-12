import { useEffect, useRef } from "react";

interface Props {
  seed: string;
  width?: number;
  height?: number;
  className?: string;
}

/** Simple seeded PRNG (mulberry32) for deterministic waveforms */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return hash;
}

/** Parse any CSS color to [r,g,b] */
function parseColor(color: string): [number, number, number] {
  // Hex
  const hex = color.replace("#", "");
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  // rgb(r, g, b)
  const m = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  return [232, 93, 42]; // fallback accent
}

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

export function AudioWaveform({ seed, width = 140, height = 80, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Get theme colors from CSS variables
    const style = getComputedStyle(document.documentElement);
    const [ar, ag, ab] = parseColor(style.getPropertyValue("--theme-accent").trim());
    const [br, bg, bb] = parseColor(style.getPropertyValue("--theme-base").trim());

    // Fill background
    ctx.fillStyle = rgba(br, bg, bb, 1);
    ctx.fillRect(0, 0, width, height);

    // Generate waveform bars
    const rng = mulberry32(hashString(seed));
    const barCount = Math.max(8, Math.round(width / 3));
    const gap = 1.5;
    const barWidth = (width - gap * (barCount - 1)) / barCount;
    const maxBarHeight = height * 0.75;
    const centerY = height / 2;

    // Generate amplitudes with smooth interpolation
    const rawAmplitudes: number[] = [];
    for (let i = 0; i < barCount; i++) {
      rawAmplitudes.push(0.15 + rng() * 0.85);
    }

    // Smooth the waveform slightly for organic feel
    const amplitudes: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const prev = rawAmplitudes[Math.max(0, i - 1)];
      const curr = rawAmplitudes[i];
      const next = rawAmplitudes[Math.min(barCount - 1, i + 1)];
      amplitudes.push(prev * 0.2 + curr * 0.6 + next * 0.2);
    }

    // Draw bars with gradient (using fillRect — no roundRect needed)
    const radius = Math.max(1, barWidth / 2);
    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const barH = Math.max(2, amplitudes[i] * maxBarHeight);
      const halfH = barH / 2;
      const y = centerY - halfH;

      // Create vertical gradient per bar
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, rgba(ar, ag, ab, 0.25));
      grad.addColorStop(0.35, rgba(ar, ag, ab, 0.8));
      grad.addColorStop(0.5, rgba(ar, ag, ab, 1));
      grad.addColorStop(0.65, rgba(ar, ag, ab, 0.8));
      grad.addColorStop(1, rgba(ar, ag, ab, 0.25));

      ctx.fillStyle = grad;

      // Draw rounded rect manually for compatibility
      ctx.beginPath();
      const r = Math.min(radius, barH / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barWidth - r, y);
      ctx.arcTo(x + barWidth, y, x + barWidth, y + r, r);
      ctx.lineTo(x + barWidth, y + barH - r);
      ctx.arcTo(x + barWidth, y + barH, x + barWidth - r, y + barH, r);
      ctx.lineTo(x + r, y + barH);
      ctx.arcTo(x, y + barH, x, y + barH - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
      ctx.fill();
    }

    // Subtle top/bottom fade overlay
    const edgeFade = ctx.createLinearGradient(0, 0, 0, height);
    edgeFade.addColorStop(0, rgba(br, bg, bb, 1));
    edgeFade.addColorStop(0.15, rgba(br, bg, bb, 0));
    edgeFade.addColorStop(0.85, rgba(br, bg, bb, 0));
    edgeFade.addColorStop(1, rgba(br, bg, bb, 1));
    ctx.fillStyle = edgeFade;
    ctx.fillRect(0, 0, width, height);
  }, [seed, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={className}
    />
  );
}
