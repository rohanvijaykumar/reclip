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
      className="fixed z-[100] min-w-[180px] bg-raised border border-subtle rounded-xl shadow-2xl p-1.5 animate-fade-in"
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
              "w-full text-left px-3 py-2 text-[12px] font-medium rounded-lg transition-colors flex items-center gap-2.5",
              item.disabled
                ? "text-tertiary cursor-not-allowed"
                : item.danger
                  ? "text-error hover:bg-error/10"
                  : "text-secondary hover:text-primary hover:bg-hover"
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
