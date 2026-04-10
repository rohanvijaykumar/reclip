import { Youtube, Twitter, Instagram } from "lucide-react";

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width="20" height="20">
      <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
    </svg>
  );
}

export function EmptyState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center animate-fade-in">
      <div className="flex gap-4 mb-6">
        {[
          { Icon: Youtube, color: "#FF0000" },
          { Icon: Twitter, color: "#1DA1F2" },
          { Icon: Instagram, color: "#E1306C" },
          { Icon: TwitchIcon, color: "#9146FF" },
        ].map(({ Icon, color }, i) => (
          <div
            key={i}
            className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center hover:scale-105 transition-all group"
          >
            <Icon className="w-5 h-5 text-tertiary transition-colors" style={{ ["--hover-color" as string]: color }} />
          </div>
        ))}
      </div>
      <h3 className="text-[15px] font-medium text-primary mb-2">Supported Platforms</h3>
      <p className="text-[13px] text-tertiary max-w-[280px]">
        Paste a link from YouTube, Twitter, Instagram, Twitch, and more to fetch video metadata.
      </p>
    </div>
  );
}
