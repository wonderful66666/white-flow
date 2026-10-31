@echo off
where node >nul 2>nul
if errorlevel 1 goto missing
if "%~1"=="" goto help
node "%~dp0tools\manage.cjs" restore %* --confirm
exit /b %errorlevel%
:help
echo Usage: Restore.cmd --state-dir "private-directory"
echo Reload VS Code after restoring. No user settings are read or written.
exit /b 1
:missing
echo Node.js 22 or later is required. Nothing was changed.
exit /b 1
