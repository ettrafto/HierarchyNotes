# HierarchyNotes - Windows Setup Guide

This guide will help you set up the development environment for HierarchyNotes on Windows with Tauri v2.

## Prerequisites

You need these installed:
- ✅ Node.js 18+ (you have this)
- ✅ Rust 1.77+ (you have this - v1.90.0)
- ✅ Visual Studio Build Tools with C++ (you have this)
- ✅ WebView2 Runtime

## The Problem

Rust on Windows (MSVC toolchain) requires the Microsoft C++ compiler and linker (`cl.exe`, `link.exe`) to be in PATH. Without them, you'll see errors like:

```
error: linker `link.exe` not found
```

## The Solution

We've created scripts that automatically add the MSVC tools to your PATH.

### Option 1: PowerShell Script (Recommended for Development)

Run this in PowerShell **every time you open a new terminal**:

```powershell
.\setup-msvc-env.ps1
```

This adds MSVC and Windows SDK to PATH for the current session only. After running it, you can use `npm run tauri:dev` normally.

**Output:**
```
Setting up MSVC environment for Tauri...

SUCCESS: MSVC tools added to PATH:
  C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64
SUCCESS: Windows SDK added to PATH:
  C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64

SUCCESS: MSVC environment ready!
  link.exe: ...
  cl.exe: ...

You can now run: npm run tauri:dev
```

### Option 2: Batch File (Auto-runs tauri:dev)

Double-click `dev-with-msvc.bat` or run it from cmd:

```batch
dev-with-msvc.bat
```

This:
1. Sets up the MSVC environment
2. Automatically runs `npm run tauri:dev`

### Option 3: Developer PowerShell for VS 2022

The easiest option - use the pre-configured terminal that comes with Visual Studio:

1. Search for "Developer PowerShell for VS 2022" in Start Menu
2. Navigate to your project:
   ```powershell
   cd C:\Users\EvanT\Desktop\Coding\HierarchyNotes
   ```
3. Run the app:
   ```powershell
   npm run tauri:dev
   ```

This terminal has MSVC tools in PATH by default.

## For VS Code Users

If you're using VS Code and getting rust-analyzer errors about `link.exe`:

1. Run the PowerShell script in VS Code's integrated terminal:
   ```powershell
   .\setup-msvc-env.ps1
   ```

2. **Fully restart VS Code** (close all windows, not just reload)
   - rust-analyzer needs the editor process to have MSVC in PATH

3. Alternative: Launch VS Code from Developer PowerShell:
   ```powershell
   # Open Developer PowerShell for VS 2022
   cd C:\Users\EvanT\Desktop\Coding\HierarchyNotes
   code .
   ```

## Permanent Solution (Optional)

To avoid running the script every time, add MSVC to your **System PATH permanently**:

1. Open System Environment Variables:
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Click "Environment Variables"

2. Under "System variables", select "Path", click "Edit"

3. Add these two paths (adjust version numbers if needed):
   ```
   C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64
   C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64
   ```

4. Click OK on all dialogs

5. **Restart your terminal and VS Code**

⚠️ **Warning**: This affects all applications system-wide. Only do this if you regularly work with Rust/C++ projects.

## Verification

After setup, verify tools are accessible:

```powershell
Get-Command link.exe | Select-Object Source
Get-Command cl.exe | Select-Object Source
```

Should output paths to the MSVC tools.

## Quick Start After Setup

Once MSVC tools are in PATH (using any method above):

```bash
# Run development server
npm run tauri:dev

# Type checking
npm run typecheck

# Build for production
npm run tauri:build
```

## Troubleshooting

### "link.exe not found" still appears

- Make sure you ran the setup script in the **same terminal** where you're running `npm run tauri:dev`
- Verify: `Get-Command link.exe` should show a path
- If empty, rerun `.\setup-msvc-env.ps1`

### rust-analyzer still shows errors in VS Code

- Fully close and reopen VS Code after running the setup script
- Or launch VS Code from Developer PowerShell (see Option 3 above)

### Port 1420 already in use

```powershell
# Kill the process using port 1420
$pid = (Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
if ($pid) { taskkill /PID $pid /F }

# Then run again
npm run tauri:dev
```

### App launches but no note windows appear

1. Click the "Reset" button in the Board window Topbar
2. This will create 6 sample notes and open their windows
3. If still nothing, check browser console (F12) for errors

### Windows behind the main board

- Check if note windows opened behind the board window
- Alt+Tab to see all windows
- Try clicking on them in the taskbar

## Files Created

- `setup-msvc-env.ps1` - PowerShell script to set up environment
- `dev-with-msvc.bat` - Batch file that sets up environment and runs dev server
- `SETUP_GUIDE.md` - This file

## Summary

**Recommended workflow:**

1. Open PowerShell in project directory
2. Run: `.\setup-msvc-env.ps1`
3. Run: `npm run tauri:dev`
4. App launches with Board + 6 Note windows

**Next time you open a terminal:**
- Repeat steps 1-3 (the setup is per-session)

**Alternative:**
- Use "Developer PowerShell for VS 2022" (no setup script needed)



