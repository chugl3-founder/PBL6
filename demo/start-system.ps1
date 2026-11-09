# Opens backend, frontend and AI worker in their own windows, then waits until all are ready.
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$Root = Split-Path $PSScriptRoot -Parent
$Python = 'E:\Program Files\Python\python.exe'
$Warmup = Join-Path $PSScriptRoot 'videos\demo_8s.mp4'
$WorkerLog = Join-Path $PSScriptRoot 'output\worker.log'
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'output') | Out-Null

function Test-Url($url) {
    try { return (Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200 } catch { return $false }
}

if (Test-Url 'http://localhost:8080/api/health') {
    Write-Host 'Backend đã chạy sẵn.' -ForegroundColor Green
} else {
    Start-Process cmd -ArgumentList '/k', "title 1. Backend 8080 && cd /d `"$Root\backend`" && powershell -ExecutionPolicy Bypass -File .\run-backend.ps1"
}
if (Test-Url 'http://localhost:5173') {
    Write-Host 'Frontend đã chạy sẵn.' -ForegroundColor Green
} else {
    Start-Process cmd -ArgumentList '/k', "title 2. Frontend 5173 && cd /d `"$Root\frontend`" && npm run dev"
}
$workerStarted = $false
if (Get-CimInstance Win32_Process -Filter "name='python.exe'" | Where-Object { $_.CommandLine -like '*worker.py*' }) {
    Write-Host 'AI worker đã chạy sẵn.' -ForegroundColor Green
} else {
    $workerStarted = $true
    Remove-Item $WorkerLog -ErrorAction SilentlyContinue
    # Port 6543 (transaction pooler) so the worker never hits the 15-client limit of port 5432.
    # The warm-up clip makes the first real analysis as fast as the following ones.
    Start-Process cmd -ArgumentList '/k', ("title 3. AI Worker && cd /d `"$Root\backend\integrations\ai-worker`" && " +
        "set DB_PORT=6543&& set AI_WARMUP_VIDEO=$Warmup&& set PYTHONUNBUFFERED=1&& " +
        "`"$Python`" worker.py 2>&1 | `"C:\Program Files\Git\usr\bin\tee.exe`" `"$WorkerLog`"")
}

Write-Host 'Đang chờ hệ thống sẵn sàng (khoảng 1-2 phút) ...' -ForegroundColor Cyan
$deadline = (Get-Date).AddMinutes(5)
$backend = $frontend = $worker = $false
while ((Get-Date) -lt $deadline -and -not ($backend -and $frontend -and $worker)) {
    Start-Sleep 3
    if (-not $backend -and (Test-Url 'http://localhost:8080/api/health')) { $backend = $true; Write-Host '  ✔ Backend  http://localhost:8080' -ForegroundColor Green }
    if (-not $frontend -and (Test-Url 'http://localhost:5173')) { $frontend = $true; Write-Host '  ✔ Frontend http://localhost:5173' -ForegroundColor Green }
    if (-not $worker) {
        $ready = -not $workerStarted -or ((Test-Path $WorkerLog) -and (Select-String -Path $WorkerLog -Pattern 'Actively listening' -Quiet))
        if ($ready) { $worker = $true; Write-Host '  ✔ AI worker đã làm nóng mô hình, đang chờ job' -ForegroundColor Green }
    }
}
if ($backend -and $frontend -and $worker) {
    Write-Host ''
    Write-Host '  HỆ THỐNG SẴN SÀNG' -ForegroundColor Green
} else {
    Write-Host '  Chưa sẵn sàng sau 5 phút, xem các cửa sổ Backend / Frontend / AI Worker.' -ForegroundColor Red
}
