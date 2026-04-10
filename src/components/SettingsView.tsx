import { ChevronLeft, HardDrive, LayoutGrid, Palette, Bell, Moon, Sun, Monitor, X, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { useConfig } from "@/contexts/ConfigContext";
import { open } from "@tauri-apps/plugin-dialog";
import type { ReactNode } from "react";

interface Props {
  onBack: () => void;
}

export function SettingsView({ onBack }: Props) {
  const { config, updateConfig } = useConfig();

  const handleBrowse = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        updateConfig({ downloadPath: selected as string });
      }
    } catch {
      // user cancelled
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    updateConfig({ notificationsEnabled: enabled });
  };

  return (
    <div className="flex flex-col h-full bg-base text-primary animate-slide-in-right z-30 relative">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-subtle bg-base sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-1.5 -ml-2 rounded-md hover:bg-hover text-secondary hover:text-primary transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={20} />
          <span className="text-[13px] font-medium">Back</span>
        </button>
        <div className="h-4 w-[1px] bg-subtle mx-1" />
        <h2 className="font-semibold text-[15px] tracking-tight">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="w-full space-y-10 pb-12">
          {/* Storage */}
          <Section title="Storage" icon={<HardDrive size={16} className="text-secondary" />}>
            <Item label="Download Location" description="Media files are automatically saved here.">
              <div className="flex flex-col sm:flex-row gap-2 w-full mt-2 sm:mt-0 sm:w-[300px]">
                <div className="flex-1 flex items-center">
                  <input
                    type="text"
                    value={config.downloadPath || "System Downloads folder"}
                    readOnly
                    className="flex-1 glass-card rounded-lg px-3 py-2 text-[13px] text-primary focus:outline-none cursor-default font-mono w-full min-w-0 truncate"
                  />
                  {config.downloadPath && (
                    <button
                      onClick={() => updateConfig({ downloadPath: null })}
                      className="ml-1 p-1.5 rounded-md hover:bg-hover text-tertiary hover:text-primary transition-colors"
                      title="Reset to default"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleBrowse}
                  className="px-4 py-2 glass-card hover:bg-hover rounded-lg text-[13px] font-medium transition-colors shrink-0"
                >
                  Browse...
                </button>
              </div>
            </Item>
          </Section>

          {/* Format Preferences */}
          <Section title="Format Preferences" icon={<LayoutGrid size={16} className="text-secondary" />}>
            <Item label="Default Video Quality" description="Pre-selects this quality when fetching videos.">
              <div className="flex gap-2 mt-2 sm:mt-0 flex-wrap">
                {[
                  { id: "best", label: "Best" },
                  { id: "4k", label: "4K" },
                  { id: "1080p", label: "1080p" },
                  { id: "720p", label: "720p" },
                ].map((q) => (
                  <button
                    key={q.id}
                    onClick={() => updateConfig({ defaultVideoQuality: q.id })}
                    className={cn(
                      "px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors border",
                      q.id === config.defaultVideoQuality
                        ? "bg-accent text-accent-text border-accent"
                        : "glass-card text-secondary hover:text-primary hover:bg-hover"
                    )}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </Item>
          </Section>

          {/* Appearance */}
          <Section title="Appearance" icon={<Palette size={16} className="text-secondary" />}>
            <Item label="Theme" description="Choose how ReClip looks.">
              <div className="flex bg-base/50 border border-subtle rounded-lg p-1 mt-2 sm:mt-0">
                {[
                  { id: "dark" as const, label: "Dark", icon: <Moon size={14} /> },
                  { id: "light" as const, label: "Light", icon: <Sun size={14} /> },
                  { id: "system" as const, label: "System", icon: <Monitor size={14} /> },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => updateConfig({ theme: opt.id })}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                      config.theme === opt.id
                        ? "bg-hover text-primary shadow-sm"
                        : "text-tertiary hover:text-secondary"
                    )}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </Item>
          </Section>

          {/* Clipboard */}
          <Section title="Clipboard" icon={<ClipboardCheck size={16} className="text-secondary" />}>
            <Item label="Clipboard Watching" description="Automatically detect media URLs when you copy them.">
              <ToggleSwitch
                checked={config.clipboardWatchEnabled}
                onChange={(v) => updateConfig({ clipboardWatchEnabled: v })}
              />
            </Item>
          </Section>

          {/* Notifications */}
          <Section title="Notifications" icon={<Bell size={16} className="text-secondary" />}>
            <Item label="Desktop Notifications" description="Get notified when downloads finish or fail.">
              <ToggleSwitch
                checked={config.notificationsEnabled}
                onChange={handleNotificationToggle}
              />
            </Item>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-primary flex items-center gap-2 mb-4">
        {icon} {title}
      </h3>
      <div className="glass-card rounded-xl p-1 shadow-sm">{children}</div>
    </section>
  );
}

function Item({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="p-4 sm:flex sm:items-center sm:justify-between gap-6">
      <div className="flex-1 mb-3 sm:mb-0">
        <label className="text-[14px] font-medium text-primary block">{label}</label>
        {description && <p className="text-[13px] text-tertiary mt-1 leading-relaxed pr-4">{description}</p>}
      </div>
      <div className="shrink-0 flex sm:justify-end w-full sm:w-auto">{children}</div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 mt-2 sm:mt-0",
        checked ? "bg-accent" : "bg-hover border border-subtle"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full transition-transform",
          checked ? "translate-x-6 bg-accent-text" : "translate-x-1 bg-secondary"
        )}
      />
    </button>
  );
}
