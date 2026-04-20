import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, HardDrive, LayoutGrid, Palette, Bell, Moon, Sun, Monitor, X, ClipboardCheck, Zap, RotateCcw, FileText, FolderTree, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useConfig } from "@/contexts/ConfigContext";
import { HugeiconsIcon } from "@hugeicons/react";
import logo from "@/assets/logo.png";
import React from "react";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { FluidTabs } from "./ui/fluid-tabs";
import { open } from "@tauri-apps/plugin-dialog";
import * as tauri from "@/lib/tauri";
import type { ReactNode } from "react";
import type { GpuDetectionResult } from "@/types";

interface Props {
  onBack: () => void;
}

const GPU_LABELS: Record<string, string> = {
  nvenc: "NVIDIA GPU detected",
  amf: "AMD GPU detected",
  qsv: "Intel GPU detected",
  software: "No compatible GPU found — using CPU",
};

export function SettingsView({ onBack }: Props) {
  const { config, updateConfig } = useConfig();
  const [gpuLabel, setGpuLabel] = useState<string>("");
  const [isProbing, setIsProbing] = useState(false);

  useEffect(() => {
    if (config.detectedGpu) {
      setGpuLabel(GPU_LABELS[config.detectedGpu] || config.detectedGpu);
    } else {
      setGpuLabel("Not yet detected");
    }
  }, [config.detectedGpu]);

  const handleRedetect = async () => {
    setIsProbing(true);
    try {
      const result = await tauri.detectGpu();
      setGpuLabel(GPU_LABELS[result.recommended] || result.label);
      await updateConfig({ detectedGpu: result.recommended });
    } catch {
      setGpuLabel("Detection failed");
    }
    setIsProbing(false);
  };

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
    <div className="flex flex-col h-full bg-transparent text-primary animate-slide-in-right z-30 relative">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-subtle/50 bg-transparent sticky top-0 z-10 backdrop-blur-md">
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
          {/* Appearance */}
          <Section title="Appearance" icon={<Palette size={16} className="text-secondary" />}>
            <Item label="Theme" description="Choose how DeClyp looks.">
              <div className="flex bg-transparent mt-2 sm:mt-0">
                <FluidTabs
                  tabs={[
                    { id: "dark", label: "Dark", icon: <Moon size={14} /> },
                    { id: "light", label: "Light", icon: <Sun size={14} /> },
                    { id: "system", label: "Auto", icon: <Monitor size={14} /> },
                  ]}
                  defaultActive={config.theme}
                  onChange={(val) => updateConfig({ theme: val as "dark" | "light" | "system" })}
                />
              </div>
            </Item>
          </Section>

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
                <Select
                  value={config.defaultVideoQuality || undefined}
                  onValueChange={(val) => { if (val) updateConfig({ defaultVideoQuality: val }); }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select quality">
                      {(() => {
                        const labels: Record<string, string> = { best: "Best Quality", "4k": "4K (2160p)", "1080p": "1080p", "720p": "720p" };
                        return labels[config.defaultVideoQuality] ?? config.defaultVideoQuality ?? "Select quality";
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best">Best Quality</SelectItem>
                    <SelectItem value="4k">4K (2160p)</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Item>
          </Section>

          {/* Filename Template */}
          <Section title="Filename Template" icon={<FileText size={16} className="text-secondary" />}>
            <FilenameTemplateEditor
              template={config.filenameTemplate}
              onChange={(t) => updateConfig({ filenameTemplate: t })}
            />
          </Section>

          {/* Output Folders */}
          <Section title="Output Folders" icon={<FolderTree size={16} className="text-secondary" />}>
            <Item label="Platform Auto-Sorting" description="Route downloads to different folders by platform. Leave empty to use default.">
              <div />
            </Item>
            <FolderRulesEditor
              rules={config.folderRules}
              onChange={(rules) => updateConfig({ folderRules: rules })}
            />
          </Section>


          {/* Performance */}
          <Section title="Performance" icon={<Zap size={16} className="text-secondary" />}>
            <Item
              label="Hardware Acceleration"
              description={
                config.hwAccelEnabled && config.detectedGpu && config.detectedGpu !== "software"
                  ? gpuLabel
                  : config.detectedGpu === "software"
                    ? "No compatible GPU found — using CPU"
                    : gpuLabel
              }
            >
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <Switch
                  checked={config.hwAccelEnabled && config.detectedGpu !== "software"}
                  onCheckedChange={(v) => updateConfig({ hwAccelEnabled: v })}
                />
              </div>
            </Item>
            <div className="px-4 pb-3">
              <button
                onClick={handleRedetect}
                disabled={isProbing}
                className="flex items-center gap-1.5 text-[12px] font-medium text-tertiary hover:text-primary transition-colors disabled:opacity-50"
              >
                <RotateCcw size={12} className={isProbing ? "animate-spin" : ""} />
                {isProbing ? "Detecting..." : "Re-detect GPU"}
              </button>
            </div>
          </Section>

          {/* Clipboard */}
          <Section title="Clipboard" icon={<ClipboardCheck size={16} className="text-secondary" />}>
            <Item label="Clipboard Watching" description="Automatically detect media URLs when you copy them.">
              <div className="mt-2 sm:mt-0">
                <Switch
                  checked={config.clipboardWatchEnabled}
                  onCheckedChange={(v) => updateConfig({ clipboardWatchEnabled: v })}
                />
              </div>
            </Item>
          </Section>

          {/* Notifications */}
          <Section title="Notifications" icon={<Bell size={16} className="text-secondary" />}>
            <Item label="Desktop Notifications" description="Get notified when downloads finish or fail.">
              <div className="mt-2 sm:mt-0">
                <Switch
                  checked={config.notificationsEnabled}
                  onCheckedChange={handleNotificationToggle}
                />
              </div>
            </Item>
          </Section>
          
          <div className="pt-8 border-t border-subtle/30 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 mb-4 relative flex items-center justify-center">
              <img 
                src={logo} 
                alt="DeClyp Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-[14px] font-semibold text-primary">DeClyp v2.0.0</p>
            <p className="text-[12px] text-tertiary mt-1">Privacy-first media toolkit. Locally powered.</p>
          </div>

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

const TEMPLATE_VARS = [
  { token: "{title}", desc: "Video title" },
  { token: "{uploader}", desc: "Channel name" },
  { token: "{platform}", desc: "YouTube, TikTok, etc." },
  { token: "{quality}", desc: "720p, 320, etc." },
  { token: "{date}", desc: "2026-04-10" },
];

function FilenameTemplateEditor({ template, onChange }: { template: string; onChange: (t: string) => void }) {
  const preview = useMemo(() => {
    return template
      .replace("{title}", "Rick Astley - Never Gonna Give You Up")
      .replace("{uploader}", "Rick Astley")
      .replace("{platform}", "YouTube")
      .replace("{quality}", "1080p")
      .replace("{date}", new Date().toISOString().slice(0, 10))
      + ".mp4";
  }, [template]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-col gap-1.5">
        <input
          type="text"
          value={template}
          onChange={(e) => onChange(e.target.value)}
          placeholder="{title}"
          spellCheck={false}
          className="w-full glass-card rounded-lg px-3 py-2 text-[13px] text-primary font-mono focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="glass-card rounded-lg px-3 py-2 text-[11px] font-mono text-tertiary truncate">
          Preview: <span className="text-secondary">{preview}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_VARS.map((v) => (
          <button
            key={v.token}
            onClick={() => onChange(template + v.token)}
            className="px-2 py-1 text-[10px] font-mono glass-card rounded-md text-tertiary hover:text-primary hover:bg-hover transition-colors"
            title={v.desc}
          >
            {v.token}
          </button>
        ))}
      </div>
    </div>
  );
}

const AVAILABLE_PLATFORMS = ["YouTube", "TikTok", "Instagram", "X", "Reddit", "SoundCloud", "Vimeo", "Facebook", "Twitch"];

function FolderRulesEditor({ rules, onChange }: { rules: Record<string, string>; onChange: (r: Record<string, string>) => void }) {
  const entries = Object.entries(rules);
  const unusedPlatforms = AVAILABLE_PLATFORMS.filter((p) => !rules[p.toLowerCase()]);

  const handleAdd = (platform: string) => {
    onChange({ ...rules, [platform.toLowerCase()]: "" });
  };

  const handleRemove = (key: string) => {
    const next = { ...rules };
    delete next[key];
    onChange(next);
  };

  const handleBrowse = async (key: string) => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        onChange({ ...rules, [key]: selected as string });
      }
    } catch { /* cancelled */ }
  };

  return (
    <div className="px-4 pb-4 space-y-2">
      {entries.map(([key, path]) => {
        const label = AVAILABLE_PLATFORMS.find((p) => p.toLowerCase() === key) || key;
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-primary w-[90px] shrink-0">{label}</span>
            <input
              type="text"
              value={path}
              readOnly
              placeholder="Click Browse..."
              className="flex-1 glass-card rounded-lg px-2.5 py-1.5 text-[12px] text-primary font-mono focus:outline-none cursor-default min-w-0 truncate"
            />
            <button
              onClick={() => handleBrowse(key)}
              className="px-2.5 py-1.5 glass-card hover:bg-hover rounded-lg text-[11px] font-medium transition-colors shrink-0"
            >
              Browse
            </button>
            <button
              onClick={() => handleRemove(key)}
              className="p-1.5 rounded-md hover:bg-hover text-tertiary hover:text-error transition-colors shrink-0"
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
      {unusedPlatforms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {unusedPlatforms.map((p) => (
            <button
              key={p}
              onClick={() => handleAdd(p)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium glass-card rounded-md text-tertiary hover:text-primary hover:bg-hover transition-colors"
            >
              <Plus size={10} /> {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
