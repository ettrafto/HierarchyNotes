# Setup MSVC environment for Tauri development
# Run this script to add MSVC and Windows SDK to PATH for the current PowerShell session

Write-Host "Setting up MSVC environment for Tauri..." -ForegroundColor Cyan

# Find Visual Studio installation
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path $vswhere)) {
    Write-Host "ERROR: vswhere.exe not found. Please install Visual Studio Build Tools." -ForegroundColor Red
    exit 1
}

$vsPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vsPath) {
    Write-Host "ERROR: Visual Studio with C++ tools not found." -ForegroundColor Red
    Write-Host "Install with: winget install -e --id Microsoft.VisualStudio.2022.BuildTools" -ForegroundColor Yellow
    exit 1
}

# Find MSVC version
$msvcVersions = Get-ChildItem "$vsPath\VC\Tools\MSVC" -ErrorAction SilentlyContinue
if (-not $msvcVersions) {
    Write-Host "ERROR: MSVC tools not found in $vsPath" -ForegroundColor Red
    exit 1
}

$latestMsvc = $msvcVersions | Sort-Object Name -Descending | Select-Object -First 1
$msvcPath = Join-Path $latestMsvc.FullName "bin\Hostx64\x64"

# Find Windows SDK
$sdkBase = "C:\Program Files (x86)\Windows Kits\10\bin"
if (-not (Test-Path $sdkBase)) {
    Write-Host "ERROR: Windows SDK not found at $sdkBase" -ForegroundColor Red
    exit 1
}

$sdkVersions = Get-ChildItem $sdkBase -Directory | Where-Object { $_.Name -match '^\d+\.' }
if (-not $sdkVersions) {
    Write-Host "ERROR: No SDK version directories found" -ForegroundColor Red
    exit 1
}

$latestSdk = $sdkVersions | Sort-Object Name -Descending | Select-Object -First 1
$sdkPath = Join-Path $latestSdk.FullName "x64"

# Verify paths exist
if (-not (Test-Path $msvcPath)) {
    Write-Host "ERROR: MSVC bin path not found: $msvcPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $sdkPath)) {
    Write-Host "ERROR: SDK bin path not found: $sdkPath" -ForegroundColor Red
    exit 1
}

# Add to PATH
$env:Path = "$msvcPath;$sdkPath;$env:Path"

Write-Host "" -ForegroundColor Green
Write-Host "SUCCESS: MSVC tools added to PATH:" -ForegroundColor Green
Write-Host "  $msvcPath" -ForegroundColor Gray
Write-Host "SUCCESS: Windows SDK added to PATH:" -ForegroundColor Green
Write-Host "  $sdkPath" -ForegroundColor Gray

# Verify tools are accessible
$linkPath = Get-Command link.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
$clPath = Get-Command cl.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source

if ($linkPath -and $clPath) {
    Write-Host "" -ForegroundColor Green
    Write-Host "SUCCESS: MSVC environment ready!" -ForegroundColor Green
    Write-Host "  link.exe: $linkPath" -ForegroundColor Gray
    Write-Host "  cl.exe: $clPath" -ForegroundColor Gray
    Write-Host "" -ForegroundColor Cyan
    Write-Host "You can now run: npm run tauri:dev" -ForegroundColor Cyan
} else {
    Write-Host "" -ForegroundColor Yellow
    Write-Host "WARNING: Tools added to PATH but not found. Try restarting your terminal." -ForegroundColor Yellow
}
