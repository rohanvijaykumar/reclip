import { cn } from "@/lib/cn";

interface Props {
  label: string;
  selected: boolean;
  onClick: () => void;
  size?: string | null;
}

export function QualityChip({ label, selected, onClick, size }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1.5 rounded-lg transition-all font-medium flex flex-col items-center gap-0.5",
        selected
          ? "bg-accent/20 border border-accent/30 text-accent font-bold scale-[1.02] shadow-sm"
          : "bg-transparent text-secondary hover:text-primary hover:bg-hover"
      )}
    >
      <span className="text-[11px] leading-tight">{label}</span>
      {size && (
        <span className={cn(
          "text-[8px] leading-tight",
          selected ? "text-secondary" : "text-tertiary"
        )}>{size}</span>
      )}
    </button>
  );
}
