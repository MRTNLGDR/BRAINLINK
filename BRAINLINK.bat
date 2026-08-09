@echo off
rem Verification branch: execute the integrated Windows stable release gate through the public BAT.
setlocal EnableExtensions
cd /d "%~dp0"
title BRAINLINK - ONE CLICK

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [BRAINLINK] ERRO: Windows PowerShell nao foi encontrado.
  echo [BRAINLINK] Este instalador requer Windows 10/11 com PowerShell 5.1 ou superior.
  if not defined CI pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\brainlink-bootstrap.ps1" %*
set "BRAINLINK_EXIT=%ERRORLEVEL%"
if not "%BRAINLINK_EXIT%"=="0" (
  echo.
  echo [BRAINLINK] A execucao falhou. O caminho do log foi mostrado acima.
  if not defined CI pause
)
exit /b %BRAINLINK_EXIT%
