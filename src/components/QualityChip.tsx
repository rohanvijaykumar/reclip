import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  size?: string | null;
  layoutId?: string;
}

export function QualityChip({ label, selected, onClick, size, layoutId }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className="relative px-2.5 py-1.5 rounded-lg transition-colors font-medium flex flex-col items-center gap-0.5"
    >
      {selected && layoutId && (
        <motion.div
          layoutId={layoutId}
          transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.8 }}
          className="absolute inset-0 rounded-lg bg-accent/20 border border-accent/30 shadow-sm"
        />
      )}
      {selected && !layoutId && (
        <div className="absolute inset-0 rounded-lg bg-accent/20 border border-accent/30 shadow-sm" />
      )}
      <span className={cn(
        "relative z-10 text-[11px] leading-tight transition-colors",
        selected ? "text-accent font-bold" : "text-secondary hover:text-primary"
      )}>{label}</span>
      {size && (
        <span className={cn(
          "relative z-10 text-[8px] leading-tight transition-colors",
          selected ? "text-secondary" : "text-tertiary"
        )}>{size}</span>
      )}
    </button>
  );
}

interface SelectorProps {
  formats: { id: string; label: string; size?: string | null }[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  layoutPrefix?: string;
}

export function QualitySelector({ formats, selectedId, onSelect, layoutPrefix }: SelectorProps) {
  const autoId = useId();
  const layoutId = `quality-pill-${layoutPrefix || autoId}`;

  return (
    <div className="flex gap-1 flex-wrap glass-card p-1 rounded-lg">
      {formats.map((f) => (
        <QualityChip
          key={f.id}
          label={f.label}
          selected={f.id === selectedId}
          onClick={() => onSelect(f.id)}
          size={f.size}
          layoutId={layoutId}
        />
      ))}
    </div>
  );
}
