@echo off
chcp 65001 >nul
echo ========================================================
echo   KHOI DONG HE THONG PBL6 BADMINTON PLATFORM (3 TERMINALS)
echo ========================================================
echo.

echo [1/3] Dang khoi dong Spring Boot Backend (Port 8080)...
start "1. Backend (Spring Boot 8080)" cmd /k "cd /d "%~dp0backend" && powershell -ExecutionPolicy Bypass -File .\run-backend.ps1"

ping 127.0.0.1 -n 3 >nul

echo [2/3] Dang khoi dong React Frontend (Port 5173)...
start "2. Frontend (React Vite 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

ping 127.0.0.1 -n 3 >nul

echo [3/4] Dang khoi dong AI Worker (CloudAMQP Consumer)...
start "3. AI Worker (PyTorch Pipeline)" cmd /k "cd /d "%~dp0backend\integrations\ai-worker" && python worker.py"

ping 127.0.0.1 -n 3 >nul

echo [4/4] Dang khoi dong BadmintonAI Coach Service (Port 8000)...
start "4. AI Coach RAG (FastAPI 8000)" cmd /k "cd /d "%~dp0ai-rag-coach" && python main.py"

echo.
echo ========================================================
echo   TAT CA 4 TERMINAL DA DUOC MO THANH CONG!
echo   - Backend:  http://localhost:8080
echo   - Frontend: http://localhost:5173
echo   - AI Worker: Dang lang nghe hang doi CloudAMQP...
echo   - AI Coach: http://localhost:8000 (RAG & Chatbot)
echo ========================================================

