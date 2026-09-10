@echo off
echo ============================================
echo   Menjalankan Nusa Wiraga (backend + frontend)
echo ============================================

start "NusaWiraga Backend" cmd /k "%~dp0start-backend.bat"
start "NusaWiraga Frontend" cmd /k "%~dp0start-frontend.bat"

echo.
echo Backend dan frontend sedang dijalankan di jendela terpisah.
echo Tunggu sampai kedua jendela menampilkan "running"/"compiled successfully",
echo lalu buka: http://localhost:3000
echo.
echo (Menutup jendela cmd yang bersangkutan akan menghentikan server itu.)
echo.

timeout /t 20 /nobreak >nul
start http://localhost:3000
