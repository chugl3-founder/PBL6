param([switch]$Local)
# Live performance demo: k6 simulates 20 concurrent viewers of the Replay page for one minute.
# Traffic goes through a fresh Cloudflare quick tunnel (a real Internet path), unless -Local is given.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$Demo = $PSScriptRoot
$Tools = Join-Path $Demo 'tools'
$Out = Join-Path $Demo 'output'
$Script = 'E:\HK1-2026\pbl6-perf\scripts\replay.js'
# Admin-curated All England 2020 match. Round 3 used match 1, which was later unpublished.
$MatchId = '3'
# Same criterion as the Round 2-3 test plan for the Replay APIs (laptop, tunnel, free Supabase).
$P95Ms = 1500
$Endpoints = 'video', 'events', 'rallies', 'statistics'
New-Item -ItemType Directory -Force (Join-Path $Out 'results') | Out-Null

function Test-Health($url) {
    try { return (Invoke-WebRequest "$url/api/health" -UseBasicParsing -TimeoutSec 10).StatusCode -eq 200 } catch { return $false }
}

function Test-PublicMatch($id) {
    foreach ($name in $Endpoints) {
        try { Invoke-WebRequest "http://localhost:8080/api/public-matches/$id/$name" -UseBasicParsing -TimeoutSec 15 | Out-Null } catch { return $false }
    }
    return $true
}

if (-not (Test-Health 'http://localhost:8080')) {
    Write-Host 'Backend chưa chạy. Chọn mục 0 trong DEMO.bat để khởi động hệ thống trước.' -ForegroundColor Red
    exit 1
}

# A match that is no longer public answers 404 to every request, which would fail the whole run.
if (-not (Test-PublicMatch $MatchId)) {
    $published = (Invoke-RestMethod 'http://localhost:8080/api/public-matches?size=50' -TimeoutSec 15).data | ForEach-Object { $_.id }
    $replacement = $published | Where-Object { Test-PublicMatch $_ } | Select-Object -First 1
    if (-not $replacement) {
        Write-Host 'Không có trận công khai nào xem được Replay. Hãy công khai một trận đã phân tích trong trang admin.' -ForegroundColor Red
        exit 1
    }
    Write-Host "Trận $MatchId không còn công khai, dùng trận $replacement." -ForegroundColor Yellow
    $MatchId = "$replacement"
}

$tunnel = $null
$BaseUrl = 'http://localhost:8080'
if (-not $Local) {
    Write-Host 'Đang mở Cloudflare Tunnel để k6 đi qua Internet thật ...' -ForegroundColor Cyan
    $log = Join-Path $Out 'tunnel.log'
    Remove-Item $log -ErrorAction SilentlyContinue
    $tunnel = Start-Process (Join-Path $Tools 'cloudflared.exe') -ArgumentList 'tunnel', '--no-autoupdate', '--url', 'http://localhost:8080' `
        -RedirectStandardError $log -WindowStyle Hidden -PassThru
    $found = $null
    for ($i = 0; $i -lt 40 -and -not $found; $i++) {
        Start-Sleep -Milliseconds 750
        if (Test-Path $log) {
            $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
            if ($m) { $found = $m.Matches[0].Value }
        }
    }
    $ready = $false
    if ($found) {
        # Asking Windows for the new name too early caches "not found" for minutes, so wait until
        # Cloudflare's own resolver knows it, then flush the local cache before the first request.
        $hostName = ([Uri]$found).Host
        for ($i = 0; $i -lt 40; $i++) {
            try { if (Resolve-DnsName $hostName -Server 1.1.1.1 -DnsOnly -ErrorAction Stop) { break } } catch { Start-Sleep 1 }
        }
        try { Clear-DnsClientCache -ErrorAction Stop } catch { ipconfig /flushdns | Out-Null }
        for ($i = 0; $i -lt 20 -and -not $ready; $i++) { $ready = Test-Health $found; if (-not $ready) { Start-Sleep 2 } }
    }
    if ($ready) {
        $BaseUrl = $found
    } else {
        Write-Host 'Không mở được tunnel (mạng?). Chuyển sang chạy trực tiếp localhost.' -ForegroundColor Yellow
        if ($tunnel) { Stop-Process -Id $tunnel.Id -ErrorAction SilentlyContinue; $tunnel = $null }
    }
}

Write-Host ''
Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host '  KIỂM THỬ HIỆU NĂNG (k6) - Replay trận đấu' -ForegroundColor Cyan
Write-Host "  Địa chỉ backend : $BaseUrl"
Write-Host '  Kịch bản        : 0 -> 20 người xem cùng lúc trong 5s, giữ 20s, giảm về 0 (30 giây)'
Write-Host "  Mỗi người xem   : gọi 4 API Replay (video, events, rallies, statistics) của trận $MatchId"
Write-Host "  Ngưỡng đạt      : p95 thời gian phản hồi <= $P95Ms ms, tỉ lệ lỗi < 1% (như Round 2-3)"
Write-Host '  Biểu đồ realtime sẽ tự mở trên trình duyệt.'
Write-Host '========================================================================' -ForegroundColor Cyan

Write-Host 'Làm nóng hệ thống (cache backend, đường tunnel) ...' -ForegroundColor DarkGray
foreach ($round in 1..5) {
    foreach ($name in $Endpoints) {
        try { Invoke-WebRequest "$BaseUrl/api/public-matches/$MatchId/$name" -UseBasicParsing -TimeoutSec 15 | Out-Null } catch { }
    }
}

$report = Join-Path $Out 'perf-demo-report.html'
$summaryJson = Join-Path $Out 'results\DEMO.json'
Remove-Item $report, $summaryJson -ErrorAction SilentlyContinue
$env:BASE_URL = $BaseUrl
$env:PROFILE = 'DEMO'
$env:MATCH_ID = $MatchId
$env:P95_MS = "$P95Ms"
$env:K6_WEB_DASHBOARD = 'true'
$env:K6_WEB_DASHBOARD_OPEN = 'false'
$env:K6_WEB_DASHBOARD_PERIOD = '1s'
$env:K6_WEB_DASHBOARD_EXPORT = $report

# k6 waits for open dashboard tabs before it exits, so the live dashboard gets its own Edge
# window that this script closes as soon as the test stops running.
$edge = $null
$profileDir = Join-Path $Out 'edge-profile'
$k6 = Start-Process (Join-Path $Tools 'k6.exe') -ArgumentList 'run', "`"$Script`"" -WorkingDirectory $Out -NoNewWindow -PassThru
$null = $k6.Handle  # keeps the handle open so ExitCode is available after exit
try {
    for ($i = 0; $i -lt 60 -and -not $k6.HasExited; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $status = (Invoke-RestMethod 'http://127.0.0.1:6565/v1/status' -TimeoutSec 2).data.attributes
            if (-not $edge) {
                $edge = Start-Process 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -PassThru -ArgumentList `
                    "--user-data-dir=`"$profileDir`"", '--no-first-run', '--start-maximized', '--app=http://127.0.0.1:5665'
            }
            if ($status.running) { break }
        } catch { }
    }
    while (-not $k6.HasExited) {
        Start-Sleep -Milliseconds 500
        try {
            if (-not (Invoke-RestMethod 'http://127.0.0.1:6565/v1/status' -TimeoutSec 2).data.attributes.running) { break }
        } catch { break }
    }
    Start-Sleep 2  # lets the dashboard draw the last data point
    if ($edge) { Stop-Process -Id $edge.Id -ErrorAction SilentlyContinue }
    $k6.WaitForExit()
    $code = $k6.ExitCode
} finally {
    if ($edge) { Stop-Process -Id $edge.Id -ErrorAction SilentlyContinue }
    if ($tunnel) { Stop-Process -Id $tunnel.Id -ErrorAction SilentlyContinue }
}

# Vietnamese summary table built from the k6 summary that replay.js writes to results\DEMO.json.
if (Test-Path $summaryJson) {
    $metrics = (Get-Content $summaryJson -Raw -Encoding UTF8 | ConvertFrom-Json).metrics
    Write-Host ''
    Write-Host '========================================================================' -ForegroundColor Cyan
    Write-Host '  BẢNG TỔNG HỢP' -ForegroundColor Cyan
    Write-Host '========================================================================' -ForegroundColor Cyan
    Write-Host ('  {0,-12} {1,10} {2,10} {3,10} {4,10}   {5}' -f 'API', 'Trung bình', 'Trung vị', 'p95', 'Lớn nhất', "p95 <= $P95Ms ms")
    foreach ($name in $Endpoints) {
        $m = $metrics."http_req_duration{name:$name}"
        $ok = ($m.thresholds.PSObject.Properties | Select-Object -First 1).Value.ok
        Write-Host ('  {0,-12} {1,7:N0} ms {2,7:N0} ms {3,7:N0} ms {4,7:N0} ms   ' -f $name, $m.values.avg, $m.values.med, $m.values.'p(95)', $m.values.max) -NoNewline
        if ($ok) { Write-Host 'ĐẠT' -ForegroundColor Green } else { Write-Host 'KHÔNG ĐẠT' -ForegroundColor Red }
    }
    $failed = $metrics.http_req_failed
    $failOk = ($failed.thresholds.PSObject.Properties | Select-Object -First 1).Value.ok
    Write-Host ''
    Write-Host ('  Tổng số request : {0:N0} ({1:N1} request/giây)' -f $metrics.http_reqs.values.count, $metrics.http_reqs.values.rate)
    Write-Host ('  Tỉ lệ lỗi       : {0:P2}   (ngưỡng < 1%)   ' -f $failed.values.rate) -NoNewline
    if ($failOk) { Write-Host 'ĐẠT' -ForegroundColor Green } else { Write-Host 'KHÔNG ĐẠT' -ForegroundColor Red }
    Write-Host ('  Số người tối đa : {0}' -f $metrics.vus_max.values.max)
    Write-Host '========================================================================' -ForegroundColor Cyan
}

Write-Host ''
if ($code -eq 0) {
    Write-Host '  KẾT QUẢ: PASSED - mọi ngưỡng hiệu năng đều đạt' -ForegroundColor Green
} else {
    Write-Host "  KẾT QUẢ: FAILED - có ngưỡng không đạt (exit $code)" -ForegroundColor Red
}
if (Test-Path $report) { Start-Process $report }
