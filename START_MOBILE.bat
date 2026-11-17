@echo off
chcp 65001 >nul
echo ========================================================
echo   KHOI DONG BADMINTONAI MOBILE APP (EXPO SDK 58)
echo ========================================================
echo.
echo [1] Neu dung Dien thoai that: Mo app Expo Go tren dien thoai va quet ma QR.
echo [2] Neu dung May ao Android (Emulator): Nhan phim 'a' tren ban phim.
echo.
cd /d "%~dp0mobile"
call npx expo start -c
pause
