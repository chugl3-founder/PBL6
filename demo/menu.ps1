# Presentation menu for the PBL6 test demo (Unit, Web, Performance).
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$Demo = $PSScriptRoot
$Root = Split-Path $Demo -Parent
$Frontend = Join-Path $Root 'frontend'
$Classifier = Join-Path $Root 'AI_Classifier'

# Analysed 28-second match (3 rallies, 14 strokes, 2 smashes) used by WT-06..WT-10.
$ReplayMatch = '245'
$ReplayEmail = 'e2e_1794060448341@badminton.vn'
$ReplayPassword = 'E2eTest@123'

# 360 Total Security removes start-system.ps1 and perf-demo.ps1 after they run, so take them back from git.
function Invoke-DemoScript($name) {
    $path = Join-Path $Demo $name
    if (-not (Test-Path $path)) {
        Write-Host "$name đã bị phần mềm diệt virus xóa, đang lấy lại từ git ..." -ForegroundColor DarkYellow
        git -C $Root restore -- "demo/$name"
    }
    & $path
}

function Set-WebEnv {
    $env:E2E_SAMPLE_VIDEO = Join-Path $Demo 'videos\demo_8s.mp4'
    $env:E2E_REPLAY_MATCH_ID = $ReplayMatch
    $env:E2E_REPLAY_EMAIL = $ReplayEmail
    $env:E2E_REPLAY_PASSWORD = $ReplayPassword
    # The test browser must not share the RTX GPU with the AI worker, or the analysis runs 2-3x slower.
    $env:E2E_BROWSER_ARGS = '--disable-gpu'
    # Edge opens maximised at the real screen size so the whole page is visible.
    $env:E2E_MAXIMIZED = '1'
}

function Invoke-Unit([switch]$Full) {
    $env:PYTHONPATH = Join-Path $Demo 'unit'
    $env:PYTHONIOENCODING = 'utf-8'
    $pyArgs = @('-m', 'pytest', 'tests/test_report_unit.py', '-p', 'ut_demo_plugin', '-p', 'no:terminal', '-p', 'no:cacheprovider')
    # Quick mode scans the first minute of the 10-minute match clip for UT-05/UT-06.
    if ($Full) { Remove-Item Env:UT_SCAN_FRAMES -ErrorAction SilentlyContinue } else { $env:UT_SCAN_FRAMES = '1800' }
    Push-Location $Classifier
    try { & (Join-Path $Classifier '.venv\Scripts\python.exe') @pyArgs } finally { Pop-Location }
}

function Invoke-WebHeaded {
    Set-WebEnv
    $env:E2E_SLOWMO = '250'
    Write-Host 'Trình duyệt Edge sẽ tự mở và thao tác WT-01 -> WT-10 (WT-05 chờ AI phân tích khoảng 35 giây).' -ForegroundColor Cyan
    Push-Location $Frontend
    try { npx playwright test -g 'WT-(0[1-9]|10)' --headed --reporter=list } finally { Pop-Location; Remove-Item Env:E2E_SLOWMO }
}

function Open-WebUi {
    Set-WebEnv
    $env:E2E_SLOWMO = '250'
    Start-Process powershell -WorkingDirectory $Frontend -ArgumentList '-NoProfile', '-Command', 'npx playwright test --ui'
    Remove-Item Env:E2E_SLOWMO
    Write-Host 'Đã mở Playwright UI. Bấm ▶ cạnh từng WT để chạy.' -ForegroundColor Cyan
}

while ($true) {
    Clear-Host
    Write-Host '==================================================================' -ForegroundColor Cyan
    Write-Host '   BỘ DEMO KIỂM THỬ - PBL6 BADMINTON AI' -ForegroundColor Cyan
    Write-Host '==================================================================' -ForegroundColor Cyan
    Write-Host '  0. Khởi động hệ thống (backend, frontend, AI worker)'
    Write-Host ''
    Write-Host '  KIỂM THỬ ĐƠN VỊ (pytest)' -ForegroundColor Yellow
    Write-Host '  1. Chạy đủ 8 case, AI quét 1 phút video             (~30 giây)'
    Write-Host '  2. Chạy đủ 8 case, AI quét cả video 10 phút         (~2 phút)'
    Write-Host ''
    Write-Host '  KIỂM THỬ WEB (Playwright)' -ForegroundColor Yellow
    Write-Host '  3. Chạy WT-01..WT-10 trên trình duyệt thật          (~1,5 phút)'
    Write-Host '  4. Mở Playwright UI, bấm chạy từng case'
    Write-Host '  5. Báo cáo đầy đủ 11/11 case (đã chạy sẵn)'
    Write-Host ''
    Write-Host '  KIỂM THỬ HIỆU NĂNG (k6)' -ForegroundColor Yellow
    Write-Host '  6. Chạy thật 20 người xem qua Internet, có biểu đồ   (~1 phút)'
    Write-Host '  7. Kết quả Round 3: PT-01..PT-10 trên GitHub Actions'
    Write-Host ''
    Write-Host '  Q. Thoát'
    Write-Host '==================================================================' -ForegroundColor Cyan
    $choice = (Read-Host 'Chọn').Trim().ToUpper()
    switch ($choice) {
        '0' { Invoke-DemoScript 'start-system.ps1' }
        '1' { Invoke-Unit }
        '2' { Invoke-Unit -Full }
        '3' { Invoke-WebHeaded }
        '4' { Open-WebUi; continue }
        '5' { Start-Process (Join-Path $Demo 'evidence\web-report\index.html'); continue }
        '6' { Invoke-DemoScript 'perf-demo.ps1' }
        '7' { Start-Process (Join-Path $Demo 'evidence\perf-round3.html'); continue }
        'Q' { return }
        default { continue }
    }
    Write-Host ''
    Read-Host 'Nhấn Enter để quay lại menu' | Out-Null
}
