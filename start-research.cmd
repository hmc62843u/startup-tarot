@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 goto bundled
node "%~dp0tools\research-server.mjs"
goto finish
:bundled
set "TAROT_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%TAROT_NODE%" goto missing
"%TAROT_NODE%" "%~dp0tools\research-server.mjs"
goto finish
:missing
echo Node 24 is required for the local ChatGPT connection. The direct-file app still works without it.
:finish
pause
