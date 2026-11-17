@echo off
chcp 65001 >nul
title KHOI DONG HE THONG MOBILE APP (BADMINTONAI)
echo ========================================================
echo     KHOI DONG NEN TANG MOBILE (BACKEND + AI COACH + EXPO)
echo ========================================================
echo.

echo [1/3] Dang khoi dong Spring Boot Backend (Port 8080)...
start "1. Backend (Spring Boot 8080)" cmd /k "cd /d "%~dp0backend" && powershell -ExecutionPolicy Bypass -File .\run-backend.ps1"

ping 127.0.0.1 -n 3 >nul

echo [2/3] Dang khoi dong AI Coach Service (FastAPI Port 8000)...
start "2. AI Coach (FastAPI 8000)" cmd /k "cd /d "%~dp0ai-rag-coach" && python main.py"

ping 127.0.0.1 -n 3 >nul

echo [3/3] Dang khoi dong Mobile App (Expo Metro Bundler)...
echo.
echo ========================================================
echo   HE THONG MOBILE APP DA DUOC KHOI DONG!
echo   - Backend API:  http://localhost:8080
echo   - AI Coach:     http://localhost:8000
echo.
echo   [Huong dan mo App]:
echo   - May that: Mo app Expo Go va quet ma QR tren man hinh
echo   - May ao Android: Nhan phim 'a' tren ban phim de mo
echo ========================================================
echo.
cd /d "%~dp0mobile"
call npx expo start -c
pause
