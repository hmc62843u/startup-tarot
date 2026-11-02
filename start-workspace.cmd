@echo off

setlocal

cd /d "%~dp0"

where node >nul 2>nul

if errorlevel 1 goto bundled

node "%~dp0enterprise\launch.mjs" %*

goto result

:bundled

set "TAROT_WORKSPACE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not exist "%TAROT_WORKSPACE_NODE%" goto missing

"%TAROT_WORKSPACE_NODE%" "%~dp0enterprise\launch.mjs" %*

goto result

:missing

echo Node 24 is required for Research Workspace. Research Publisher still opens directly without it.

echo See enterprise\LAUNCHER.md for setup.

set "TAROT_WORKSPACE_EXIT=1"

goto finish

:result

set "TAROT_WORKSPACE_EXIT=%ERRORLEVEL%"

:finish

if not "%TAROT_WORKSPACE_EXIT%"=="0" if not "%WORKSPACE_LAUNCHER_NO_PAUSE%"=="1" pause

endlocal & exit /b %TAROT_WORKSPACE_EXIT%
