# Force Refresh Windows Icon Cache
Write-Host "Shutting down explorer.exe..." -ForegroundColor Yellow
taskkill /f /im explorer.exe

Write-Host "Wait for explorer to close..."
Start-Sleep -Seconds 2

Write-Host "Deleting Icon Cache databases..." -ForegroundColor Yellow
$localAppData = $env:LOCALAPPDATA
Remove-Item "$localAppData\IconCache.db" -Force -ErrorAction SilentlyContinue
Get-ChildItem "$localAppData\Microsoft\Windows\Explorer\iconcache*.db" | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "Restarting explorer.exe..." -ForegroundColor Green
start explorer.exe

Write-Host "Done! Your DeClyp icons should now be updated." -ForegroundColor Cyan
