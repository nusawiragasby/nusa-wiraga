@echo off
setlocal enableextensions
title NusaWiraga Frontend
cd /d "%~dp0frontend"

:: --- Pakai npm (bawaan Node.js), BUKAN yarn ---
:: npm selalu ikut terpasang bersama Node.js, jadi tidak pernah "hilang"
:: seperti yarn global yang dipasang lewat npm di Windows. Kita cukup
:: memastikan folder Node.js ada di depan PATH; npm pasti ikut kebaca.
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
    echo [X] Node.js tidak ditemukan.
    echo     Dicari di: "%ProgramFiles%\nodejs\node.exe"
    echo     Pasang Node.js dari https://nodejs.org lalu buka ulang jendela ini.
    echo.
    echo     PATH saat ini:
    echo     %PATH%
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [X] 'npm' tidak ditemukan padahal Node.js ada - instalasi Node mungkin rusak.
    echo     Coba pasang ulang Node.js dari https://nodejs.org
    pause
    exit /b 1
)

echo [OK] node: & where node
echo [OK] npm:  & where npm
echo.

if not exist "node_modules" (
    echo [!] node_modules belum ada. Menjalankan npm install dulu...
    call npm install
    if errorlevel 1 (
        echo [X] npm install gagal. Lihat pesan di atas.
        pause
        exit /b 1
    )
)

if not exist ".env" (
    echo [!] File frontend\.env tidak ditemukan. Membuat default...
    echo REACT_APP_BACKEND_URL=http://localhost:8000> .env
)

set BROWSER=none
echo Menjalankan frontend di http://localhost:3000 ...
call npm start
echo.
echo [i] Server frontend berhenti. Tekan tombol apa saja untuk menutup jendela ini.
pause
