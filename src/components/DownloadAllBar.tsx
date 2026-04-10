import { Download } from "lucide-react";

interface Props {
  readyCount: number;
  onDownloadAll: () => void;
}

export function DownloadAllBar({ readyCount, onDownloadAll }: Props) {
  return (
    <div className="glass-panel shadow-2xl rounded-xl p-4 flex items-center justify-between ring-1 ring-white/5 glow-accent">
      <div className="flex flex-col">
        <span className="text-[14px] font-medium text-primary">{readyCount} items ready</span>
      </div>
      <button
        onClick={onDownloadAll}
        className="h-10 px-6 bg-accent hover:bg-accent-hover active:scale-[0.98] text-accent-text font-semibold text-[13px] rounded-lg transition-all shadow-md flex items-center gap-2"
      >
        <Download size={16} /> Download All
      </button>
    </div>
  );
}
