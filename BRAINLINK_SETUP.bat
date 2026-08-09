@echo off
rem Legacy stable materializer retained for audit: scripts\materialize-brainlink.ps1
call "%~dp0BRAINLINK.bat" --setup-only %*
exit /b %errorlevel%
