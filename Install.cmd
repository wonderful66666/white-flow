@echo off
where node >nul 2>nul
if errorlevel 1 goto missing
if "%~1"=="" goto help
node "%~dp0tools\manage.cjs" apply %* --confirm
exit /b %errorlevel%
:help
echo Usage: Install.cmd --app-root "installation" --state-dir "private-directory"
echo Run the documented plan command before applying. Administrator rights may be required.
exit /b 1
:missing
echo Node.js 22 or later is required. Nothing was installed or changed.
exit /b 1
