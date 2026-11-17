@echo off
chcp 65001 >nul
title KHOI DONG HE THONG WEB (BADMINTONAI)
echo ========================================================
echo     KHOI DONG NEN TANG WEB (BACKEND + AI COACH + FRONTEND)
echo ========================================================
echo.

echo [1/4] Dang khoi dong Spring Boot Backend (Port 8080)...
start "1. Backend (Spring Boot 8080)" cmd /k "cd /d "%~dp0backend" && powershell -ExecutionPolicy Bypass -File .\run-backend.ps1"

ping 127.0.0.1 -n 3 >nul

echo [2/4] Dang khoi dong AI Coach Service (FastAPI Port 8000)...
start "2. AI Coach (FastAPI 8000)" cmd /k "cd /d "%~dp0ai-rag-coach" && python main.py"

ping 127.0.0.1 -n 2 >nul

echo [3/4] Dang khoi dong Media Worker (Highlight ffmpeg)...
start "3. Media Worker" cmd /k "cd /d "%~dp0backend\integrations\media-worker" && python worker.py"

ping 127.0.0.1 -n 2 >nul

echo [4/4] Dang khoi dong Web Frontend (React Vite Port 5173)...
start "4. Web Frontend (Vite 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo   HE THONG WEB DA DUOC KHOI DONG THANH CONG!
echo   - Web Frontend: http://localhost:5173
echo   - Backend API:  http://localhost:8080
echo   - AI Coach:     http://localhost:8000
echo   (AI GPU Worker dang lang nghe tren may chu GPU tu xa)
echo ========================================================
pause
