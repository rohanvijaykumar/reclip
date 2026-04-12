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
        "px-2 py-1 rounded-md transition-all font-medium flex flex-col items-center gap-0",
        selected
          ? "bg-hover text-primary shadow-sm"
          : "bg-transparent text-secondary hover:text-primary hover:bg-hover/50"
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
