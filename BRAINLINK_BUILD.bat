@echo off
call "%~dp0BRAINLINK.bat" --build-only %*
exit /b %errorlevel%
