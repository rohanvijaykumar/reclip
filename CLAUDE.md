# DeClyp - Desktop Media Toolkit

Privacy-first desktop media toolkit for downloading, converting, and compressing media.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS v4 + Vite
- **Backend**: Tauri 2.0 (Rust)
- **Sidecar Binaries**: `yt-dlp` (Downloader) and `ffmpeg` (Encoder/Merger)
- **Design**: **Watermelon UI** (Modern Glassmorphism with Premium Orange Accent `hsl(22, 92%, 55%)`)

## Recent Progress & "War Story" (Last 24 Hours)

### 1. Watermelon UI Overhaul
- **Branding**: Fully implemented the "Watermelon UI" aesthetic across all views (documented in `theme.css`).
- **Aesthetics**: High-end Glassmorphic overhaul featuring animated cards, responsive grids, and localized noise textures.
- **Core Design**: Custom CSS tokens in `src/styles/theme.css` for optimized Dark and Light modes.
- **Components**: Responsive `VideoCard` system, enhanced `SettingsView`, and premium interactive transitions.

### 2. Fetch Stabilization
- **Selective Bypass**: Discovered that aggressive YouTube bypass arguments (`player_client=ios`) were breaking Instagram/TikTok fetches. Fixed by implementing selective argument injection in `src-tauri/src/commands/download.rs`.
- **Browser Authentication**: Added "YouTube Authentication" in Settings, allowing users to select a browser (Chrome/Edge/Brave) to pass session cookies to `yt-dlp`, effectively bypassing aggressive "bot detected" screens.
- **Diagnostics**: Switched from truncated error messages to **Full Error Logging**. Failed fetches now display the raw `stderr` in a scrollable UI container for immediate debugging.

### 3. Binary & Pathing Resolution
- **Robust Search**: Replaced brittle Tauri resource resolution with a multi-stage search strategy in `download.rs`. The app now looks in:
    1. The `.exe` directory (for production/release).
    2. The `src-tauri` root (for development).
    3. The Tauri resource folder (for bundled installers).
- **Debug Bundles**: Resolved `ERR_CONNECTION_REFUSED` by documenting that standalone Debug EXEs must be built via `npm run tauri build -- --debug` to include the frontend assets.

## Core Architectural Patterns

### Sidecar Handling (Rust)
Current implementation uses `tauri_plugin_shell::ShellExt`. Sidecar names are `yt-dlp` and `ffmpeg`.
- **Selective Bypass Logic**: `pub async fn get_info` and `pub async fn get_playlist_info` check the URL for `youtube.com` before applying specific extractor args.
- **Merging Logic**: `start_download` manually resolves `ffmpeg` to ensure video/audio merging works in both portable EXEs and installed apps.

### Settings Management
Settings are stored in `%APPDATA%/com.declyp.app/config.json`.
- **Key Fields**: `cookies_browser`, `hw_accel_enabled`, `download_path`, `folder_rules`.

## Development Commands
- `npm run tauri dev` — Standard dev flow (requires Vite).
- `npm run tauri build -- --debug` — Standalone Debug EXE (with assets).
- `npm run tauri build` — Production release.

## Current Known Issues
1. **IP Blocks**: Aggressive platforms (like TikTok) may still block the IP entirely; the new Diagnostic logs now confirm this.
2. **Binary Matching**: On Windows, binaries must follow the sidecar naming convention (e.g., `yt-dlp-x86_64-pc-windows-msvc.exe`).
