@echo off
REM Launch development environment with MSVC tools in PATH
REM Usage: dev-with-msvc.bat

echo Setting up MSVC environment for Tauri development...

REM Find Visual Studio installation
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" (
    echo ERROR: vswhere.exe not found. Please install Visual Studio Build Tools.
    pause
    exit /b 1
)

REM Get VS installation path
for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
    set "VS_PATH=%%i"
)

if not defined VS_PATH (
    echo ERROR: Visual Studio with C++ tools not found.
    echo Install with: winget install -e --id Microsoft.VisualStudio.2022.BuildTools
    pause
    exit /b 1
)

REM Find latest MSVC version
for /f "delims=" %%i in ('dir "%VS_PATH%\VC\Tools\MSVC" /b /ad /o-n') do (
    set "MSVC_VERSION=%%i"
    goto :found_msvc
)
:found_msvc

if not defined MSVC_VERSION (
    echo ERROR: MSVC tools not found
    pause
    exit /b 1
)

set "MSVC_PATH=%VS_PATH%\VC\Tools\MSVC\%MSVC_VERSION%\bin\Hostx64\x64"

REM Find latest Windows SDK
for /f "delims=" %%i in ('dir "C:\Program Files (x86)\Windows Kits\10\bin\10.*" /b /ad /o-n') do (
    set "SDK_VERSION=%%i"
    goto :found_sdk
)
:found_sdk

if not defined SDK_VERSION (
    echo ERROR: Windows SDK not found
    pause
    exit /b 1
)

set "SDK_PATH=C:\Program Files (x86)\Windows Kits\10\bin\%SDK_VERSION%\x64"

REM Add to PATH
set "PATH=%MSVC_PATH%;%SDK_PATH%;%PATH%"

echo.
echo ✓ MSVC environment ready!
echo   MSVC: %MSVC_PATH%
echo   SDK:  %SDK_PATH%
echo.
echo You can now run: npm run tauri:dev
echo.

REM Run the dev command
npm run tauri:dev

pause



