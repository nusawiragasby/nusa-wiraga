@echo off
setlocal enableextensions
title NusaWiraga Backend
cd /d "%~dp0backend"

:: --- Pastikan Python selalu kebaca, tak peduli PATH jendela ini basi ---
:: (lihat penjelasan di start-frontend.bat). Kita tambahkan lokasi Python
:: yang umum ke DEPAN PATH bila ada, supaya "python -m venv" pasti jalan
:: saat setup pertama kali.
if exist "%LocalAppData%\Programs\Python" (
    for /d %%p in ("%LocalAppData%\Programs\Python\Python3*") do set "PATH=%%p;%%p\Scripts;%PATH%"
)

if not exist "venv\Scripts\activate.bat" (
    echo [!] Virtual environment belum ada. Menjalankan setup pertama kali...
    where python >nul 2>nul
    if errorlevel 1 (
        echo [X] Python tidak ditemukan untuk membuat venv.
        echo     Pasang Python dari https://python.org lalu buka ulang jendela ini.
        echo.
        echo     PATH saat ini:
        echo     %PATH%
        pause
        exit /b 1
    )
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

if not exist ".env" (
    echo [!] File backend\.env tidak ditemukan. Backend tidak akan bisa jalan tanpa itu.
    pause
    exit /b 1
)

echo Menjalankan backend di http://127.0.0.1:8000 ...
uvicorn server:app --host 127.0.0.1 --port 8000 --reload
echo.
echo [i] Server backend berhenti. Tekan tombol apa saja untuk menutup jendela ini.
pause
