# Fixes Applied - Note Windows Issue

## Problems Identified

From your console output, I found three critical issues:

### 1. ❌ Infinite Loop in LinkLayer
**Error**: `Maximum update depth exceeded`
**Cause**: Using unstable selectors (`selectAllLinks`, `selectConnectStyle`) that created new references on every render
**Fix**: Changed to inline selectors directly in the component

### 2. ❌ Notes Marked as "Already Open" 
**Error**: `[Store] Note window already open: note-1`
**Cause**: Saved layout.json had `isOpen: true` but windows weren't actually spawned
**Fix**: Reset `isOpen = false` for all notes when loading saved state

### 3. ❌ Multiple Board Windows / Re-initialization
**Error**: Initialization running multiple times, creating duplicate Board windows
**Cause**: `useEffect` dependencies causing re-runs on every render
**Fix**: Changed to empty dependency array `[]` and used `didInit` flag

## Changes Made

### src/components/Board/LinkLayer.tsx
```typescript
// BEFORE (caused infinite loop):
const links = useBoardStore(selectAllLinks);
const connectStyle = useBoardStore(selectConnectStyle);

// AFTER (stable):
const links = useBoardStore((state) => Object.values(state.links));
const connectStyle = useBoardStore((state) => state.ui.connectStyle);
```

### src/pages/BoardPage.tsx
```typescript
// BEFORE (re-ran on every render):
useEffect(() => {
  initializeBoard();
}, [initializeFromState, openNoteWindow]);

// AFTER (runs once):
useEffect(() => {
  let didInit = false;
  const initializeBoard = async () => {
    if (didInit) return;
    didInit = true;
    // ... initialization code using useBoardStore.getState()
  };
  initializeBoard();
}, []); // Empty deps
```

```typescript
// BEFORE (notes marked as open when they weren't):
initializeFromState(savedState);

// AFTER (reset isOpen flag):
Object.values(savedState.notes).forEach(note => {
  note.isOpen = false;
});
initializeFromState(savedState);
```

### src/app/store.ts
```typescript
// Removed problematic selectors that caused re-renders:
export const selectAllLinks = ... // REMOVED
export const selectConnectStyle = ... // REMOVED
// etc.
```

### src/components/Board/*.tsx
Updated Grid, Toolbar, Inspector to use inline selectors instead of imported selectors.

## What Should Happen Now

When you open the Board window (F12 to see console), you should see:

```
[BoardPage] Initializing board...
[BoardPage] Loaded state: {...}
[BoardPage] Loading saved state with 6 notes
[BoardPage] Opening note window: note-1
[Store] openNoteWindow called for: note-1
[Store] Spawning window for note: note-1
[IPC] spawnNoteWindow called with: {id: 'note-1', rect: {...}}
[IPC] spawnNoteWindow completed for: note-1
[Store] Note window spawned successfully: note-1
```

Repeated for all 6 notes.

## Expected Result

✅ **ONE Board window** (not multiple)
✅ **NO infinite loop errors**
✅ **6 Note windows** should spawn around your screen
✅ **Console logs** show successful spawning
✅ **Connectors** visible between notes

## If Note Windows Still Don't Appear

1. **Check Alt+Tab** - they might be behind the Board
2. **Check taskbar** - look for multiple hierarchynotes windows
3. **Check console** - look for errors after "[IPC] spawnNoteWindow called"
4. **Delete layout file** and restart:
   ```powershell
   Remove-Item "$env:APPDATA\com.evant.hierarchynotes\layout.json"
   npm run tauri:dev
   ```

## Debugging Still Enabled

The console logging is still active. If issues persist, share:
1. Full console output (F12 → Console tab)
2. Any red error messages
3. Whether you see note windows in Alt+Tab

## Next Steps

Once note windows appear:
- **Move them** → lines should update in real-time
- **Resize them** → connectors adjust anchor points
- **Edit content** → auto-saves
- **Press N** → create new note window
- **Toggle path style** → switch between smooth/orthogonal

The app should now work as designed! 🎉

