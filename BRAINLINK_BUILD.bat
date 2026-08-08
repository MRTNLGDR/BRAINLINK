@echo off
setlocal
cd /d "%~dp0"
if not exist ".brainlink-workspace\AFFiNE\package.json" call BRAINLINK_SETUP.bat
if errorlevel 1 exit /b %errorlevel%
cd /d ".brainlink-workspace\AFFiNE"
corepack yarn brainlink:build
