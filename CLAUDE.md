# ReClip

Privacy-first desktop media toolkit — download, convert, compress.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS v4 + Vite
- **Backend:** Tauri 2 (Rust)
- **UI icons:** lucide-react
- **Utilities:** clsx, tailwind-merge

## Project Structure

- `src/` — React frontend (components, hooks, contexts, types, lib)
- `src-tauri/src/` — Rust backend (Tauri commands, state management)
- `src/components/` — UI components (VideoCard, SettingsView, HistoryView, etc.)
- `src/components/converter/` — File converter feature
- `src/components/compressor/` — Video/audio compressor feature

## Development

```bash
npm run tauri:dev    # Run the app in dev mode (Vite + Tauri)
npm run build        # TypeScript check + Vite build
npm run tauri:build  # Production build
```

## Key Conventions

- Tauri commands in Rust are invoked from the frontend via `@tauri-apps/api`
- The app uses yt-dlp and ffmpeg as sidecar binaries (in `src-tauri/binaries/`)
- Tabs: Download, Convert, Compress (main UI)
- State management via React contexts in `src/contexts/`
