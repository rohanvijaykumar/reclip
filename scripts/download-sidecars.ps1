# Download sidecar binaries for ReClip (Windows x86_64)
# Run: powershell -ExecutionPolicy Bypass -File scripts/download-sidecars.ps1

$ErrorActionPreference = "Stop"
$BinDir = Join-Path $PSScriptRoot "..\src-tauri\binaries"
$Triple = "x86_64-pc-windows-msvc"

# Create binaries directory
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

# --- yt-dlp ---
$YtDlpPath = Join-Path $BinDir "yt-dlp-$Triple.exe"
if (Test-Path $YtDlpPath) {
    Write-Host "yt-dlp already exists, skipping download"
} else {
    Write-Host "Downloading yt-dlp..."
    $YtDlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    Invoke-WebRequest -Uri $YtDlpUrl -OutFile $YtDlpPath
    Write-Host "yt-dlp downloaded to $YtDlpPath"
}

# --- ffmpeg ---
$FfmpegPath = Join-Path $BinDir "ffmpeg-$Triple.exe"
if (Test-Path $FfmpegPath) {
    Write-Host "ffmpeg already exists, skipping download"
} else {
    Write-Host "Downloading ffmpeg..."
    $FfmpegZipUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    $TempZip = Join-Path $env:TEMP "ffmpeg-download.zip"
    $TempExtract = Join-Path $env:TEMP "ffmpeg-extract"

    Invoke-WebRequest -Uri $FfmpegZipUrl -OutFile $TempZip

    # Clean up previous extraction
    if (Test-Path $TempExtract) { Remove-Item -Recurse -Force $TempExtract }

    Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force

    # Find ffmpeg.exe in extracted directory
    $FfmpegExe = Get-ChildItem -Path $TempExtract -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
    if ($FfmpegExe) {
        Copy-Item $FfmpegExe.FullName $FfmpegPath
        Write-Host "ffmpeg downloaded to $FfmpegPath"
    } else {
        Write-Error "ffmpeg.exe not found in downloaded archive"
    }

    # Cleanup temp files
    Remove-Item -Force $TempZip -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force $TempExtract -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Sidecar binaries ready:"
Get-ChildItem $BinDir | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 1)
    Write-Host "  $($_.Name) ($size MB)"
}
