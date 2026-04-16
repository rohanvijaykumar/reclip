import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Maximize2 } from "lucide-react";

const appWindow = getCurrentWindow();

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    appWindow.isMaximized().then(setMaximized);
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 h-9 z-[200] flex items-center justify-end">
      {/* Full-width drag surface */}
      <div
        className="absolute inset-0"
        onMouseDown={() => appWindow.startDragging()}
        onDoubleClick={() => appWindow.toggleMaximize().then(() => appWindow.isMaximized().then(setMaximized))}
      />

      {/* Window controls */}
      <div className="relative z-10 flex items-center">
        <button
          onClick={() => appWindow.minimize()}
          className="h-9 w-11 flex items-center justify-center text-tertiary hover:text-primary hover:bg-white/10 transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize().then(() => appWindow.isMaximized().then(setMaximized))}
          className="h-9 w-11 flex items-center justify-center text-tertiary hover:text-primary hover:bg-white/10 transition-colors"
        >
          {maximized ? <Square size={11} /> : <Maximize2 size={12} />}
        </button>
        <button
          onClick={() => appWindow.close()}
          className="h-9 w-11 flex items-center justify-center text-tertiary hover:text-white hover:bg-red-500 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
