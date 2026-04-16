import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, GpuDetectionResult } from "@/types";

const DEFAULT_CONFIG: AppConfig = {
  downloadPath: null,
  defaultVideoQuality: "best",
  notificationsEnabled: false,
  theme: "dark",
  clipboardWatchEnabled: true,
  hwAccelEnabled: true,
  detectedGpu: null,
  filenameTemplate: "{title}",
  folderRules: {},
};

interface ConfigContextValue {
  config: AppConfig;
  updateConfig: (partial: Partial<AppConfig>) => Promise<void>;
  isLoaded: boolean;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: DEFAULT_CONFIG,
  updateConfig: async () => {},
  isLoaded: false,
});

export function useConfig() {
  return useContext(ConfigContext);
}

function applyTheme(theme: string) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const configRef = useRef(config);
  configRef.current = config;

  // Load config on mount, auto-detect GPU if not yet detected
  useEffect(() => {
    invoke<AppConfig>("get_config")
      .then(async (cfg) => {
        setConfig(cfg);
        applyTheme(cfg.theme);
        setIsLoaded(true);

        // Auto-detect GPU on first run
        if (!cfg.detectedGpu) {
          try {
            const result = await invoke<GpuDetectionResult>("detect_gpu");
            const merged = { ...cfg, detectedGpu: result.recommended };
            setConfig(merged);
            configRef.current = merged;
            await invoke("save_config", { config: merged });
          } catch {
            // Detection failed — leave as null (will use software)
          }
        }
      })
      .catch(() => {
        applyTheme("dark");
        setIsLoaded(true);
      });
  }, []);

  // React to theme changes
  useEffect(() => {
    applyTheme(config.theme);

    if (config.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [config.theme]);

  const updateConfig = useCallback(async (partial: Partial<AppConfig>) => {
    const merged = { ...configRef.current, ...partial };
    setConfig(merged);
    try {
      await invoke("save_config", { config: merged });
    } catch (e) {
      console.error("Failed to save config:", e);
    }
  }, []);

  return (
    <ConfigContext.Provider value={{ config, updateConfig, isLoaded }}>
      {children}
    </ConfigContext.Provider>
  );
}
