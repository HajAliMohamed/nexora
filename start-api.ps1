# Kill old API
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
  try { $_.MainWindowTitle -eq "" -and $_.Path -like "*node*" } catch { $false }
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Build
cd C:\Users\moham\Desktop\yvan\nexora\nexora-api
Write-Host "Building..." -NoNewline
pnpm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host " BUILD FAILED"; exit 1 }
Write-Host " OK"

# Start in background (no log spam)
Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-Command", "cd 'C:\Users\moham\Desktop\yvan\nexora\nexora-api'; node .\dist\main.js *> C:\Users\moham\Desktop\yvan\nexora\api.log"

# Wait for health
Write-Host "Waiting for API..." -NoNewline
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 1
  try { 
    $r = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host " Ready! ($($r.StatusCode))"
    exit 0
  } catch { Write-Host "." -NoNewline }
}
Write-Host " FAILED"
exit 1
