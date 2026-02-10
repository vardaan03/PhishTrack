@echo off
title PhishTrack AI Server
color 0b

echo ==================================================
echo   PHISHTRACK_ NEURAL DEFENSE SYSTEM (V6.0)
echo ==================================================
echo.

REM 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Python is not found!
    echo Please install Python from https://python.org
    echo.
    pause
    exit /b
)

echo [STATUS] Python detected. Checking dependencies...
echo.

REM 2. Install Requirements
pip install -r requirements.txt
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Failed to install libraries. Check your internet connection.
    pause
    exit /b
)

echo.
echo [STATUS] All systems ready.
echo [IMPORTANT] The first time you run this, it effectively DOWNLOADS the AI Brain (250MB).
echo [IMPORTANT] Please wait for "Application startup complete" in this window.
echo.

echo [STATUS] Launching Portal in Browser (waiting 10s for startup)...
timeout /t 10 >nul
start http://127.0.0.1:8000

echo.
echo [STATUS] Starting Neural Core (FastAPI)...
echo --------------------------------------------------
echo DO NOT CLOSE THIS WINDOW.
echo If it crashes, read the error message below.
echo --------------------------------------------------
echo.

python main.py
pause
