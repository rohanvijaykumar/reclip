import { cn } from "@/lib/cn";

interface Props {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function QualityChip({ label, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[11px] px-2 py-1 rounded-md transition-all font-medium",
        selected
          ? "bg-hover text-primary shadow-sm"
          : "bg-transparent text-secondary hover:text-primary hover:bg-hover/50"
      )}
    >
      {label}
    </button>
  );
}
