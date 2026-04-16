import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { ContextMenuItem } from "@/types";

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const el = ref.current;
    if (rect.right > window.innerWidth) {
      el.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[180px] rounded-xl glass-panel p-1.5 text-primary shadow-2xl ring-1 ring-white/10 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="h-px bg-subtle my-1.5 mx-2" />;
        }
        return (
          <button
            key={i}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={cn(
              "w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2",
              item.disabled
                ? "text-tertiary cursor-not-allowed opacity-50"
                : item.danger
                  ? "text-error hover:bg-error/10"
                  : "hover:bg-hover hover:text-primary"
            )}
          >
            {item.icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
