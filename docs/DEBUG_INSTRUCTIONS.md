# Debugging Instructions for Note Windows

## Current Status

The Board window is loading but note windows aren't appearing. I've added extensive logging to help debug this.

## How to Debug

1. **Start the dev server** (if not already running):
   ```powershell
   .\setup-msvc-env.ps1
   npm run tauri:dev
   ```

2. **Open the Board window's Developer Console**:
   - When the Board window appears, press **F12** or **Ctrl+Shift+I**
   - Click on the **Console** tab

3. **Look for these log messages**:
   ```
   [BoardPage] Initializing board...
   [BoardPage] Loaded state: {...}
   [BoardPage] No saved state, creating sample data
   [BoardPage] Sample data created with 6 notes
   [BoardPage] Opening note window: note-1
   [Store] openNoteWindow called for: note-1
   [Store] Spawning window for note: note-1 rect: {x:..., y:..., width:..., height:...}
   [IPC] spawnNoteWindow called with: {id: 'note-1', rect: {...}}
   [IPC] spawnNoteWindow completed for: note-1
   [Store] Note window spawned successfully: note-1
   ```

4. **What to look for**:
   - ❌ **If you see errors**, copy them
   - ❌ **If logging stops** at a certain point, note where
   - ✅ **If all logs appear**, note windows should spawn

5. **Check if note windows opened behind the Board**:
   - Press **Alt+Tab** to see all windows
   - Look in the taskbar for multiple windows
   - Try minimizing the Board window

## Common Issues

### Issue: Console shows "Failed to spawn note window"

**Likely cause**: Rust backend isn't receiving the IPC command

**Fix**: Check terminal output for Rust errors

### Issue: Console shows initialization but no spawning

**Likely cause**: Store or initialization logic issue

**Fix**: Check if `initializeFromState` is being called

### Issue: Windows spawn but immediately close

**Likely cause**: Note page errors

**Fix**: Check terminal for React errors in note.html

### Issue: No console logs at all

**Likely cause**: App isn't loading/crashing

**Fix**: Check terminal for build errors

## Manual Test

If the automatic initialization doesn't work, try clicking the **"Reset" button** in the Topbar (top-left). This should:
1. Clear existing state
2. Create 6 sample notes
3. Spawn all note windows
4. You should see the same log sequence

## Alternative: Check Layout File

The layout file might exist and be empty/corrupt:

**Location**: `C:\Users\EvanT\AppData\Roaming\com.evant.hierarchynotes\layout.json`

**To reset**:
1. Close the app
2. Delete this file
3. Restart the app (it will create fresh sample data)

## What to Report

Please provide:
1. **Full console output** from the Board window (F12 → Console)
2. **Terminal output** showing any Rust errors
3. **Screenshot** of what you see
4. **Result of** pressing Reset button

This will help me identify exactly where the issue is occurring.

