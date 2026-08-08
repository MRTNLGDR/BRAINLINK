@echo off
setlocal
cd /d "%~dp0"
where powershell >nul 2>nul || (echo [BRAINLINK] PowerShell is required.& exit /b 1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\materialize-brainlink.ps1" -Install
exit /b %errorlevel%
