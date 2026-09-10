@echo off
echo Menghentikan server NusaWiraga Backend & Frontend...
taskkill /FI "WINDOWTITLE eq NusaWiraga Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq NusaWiraga Frontend*" /T /F >nul 2>&1
echo Selesai.
pause
