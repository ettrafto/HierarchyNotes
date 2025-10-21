# HierarchyNotes - Troubleshooting Guide

## Common Issues and Solutions

### Build Issues

#### 1. TypeScript Errors

**Problem**: TypeScript compilation fails
```bash
npm run typecheck
```

**Solution**: 
- Ensure all dependencies are installed: `npm install`
- Check for missing type definitions
- Verify imports are pointing to correct paths

#### 2. Tailwind Not Loading

**Problem**: Styles not appearing

**Solution**:
- Verify `globals.css` is imported in `main.tsx` and `note-main.tsx`
- Check `tailwind.config.js` content paths
- Restart dev server after config changes

#### 3. Vite Build Errors

**Problem**: Multi-page build fails

**Solution**:
- Ensure both `index.html` and `note.html` exist
- Check `vite.config.ts` rollupOptions
- Verify paths in `resolve(__dirname, 'index.html')`

### Runtime Issues

#### 1. Note Windows Not Opening

**Problem**: Clicking "New Note" does nothing

**Possible Causes**:
- Rust backend not running
- IPC command failing
- Window spawn error

**Debug Steps**:
```typescript
// Check console for errors in Board window
// Look for: "Failed to spawn note window: ..."
```

**Solution**:
- Check Rust console output for errors
- Verify `spawn_note_window` command is registered
- Check window label format: `note-{id}`

#### 2. Connectors Not Updating

**Problem**: Lines don't update when moving notes

**Possible Causes**:
- IPC events not emitting from note windows
- Board not listening to events
- State not updating

**Debug Steps**:
```typescript
// In NotePage.tsx, add console logs:
console.log('Emitting moved event', { id, rect });

// In BoardPage.tsx, add logs in listeners:
onNoteMoved((event) => {
  console.log('Received moved event', event);
  updateNoteRect(event.id, event.rect);
});
```

**Solution**:
- Verify polling interval is running (check for `setInterval` in NotePage)
- Ensure `emitNoteMoved` is being called
- Check that Board has set up listeners in `useEffect`

#### 3. Layout Not Persisting

**Problem**: Layout resets on restart

**Possible Causes**:
- Persistence command failing
- App data directory not writable
- JSON serialization error

**Debug Steps**:
```bash
# Check if layout.json exists:
# Windows: %APPDATA%\com.evant.hierarchynotes\layout.json
# macOS: ~/Library/Application Support/com.evant.hierarchynotes/layout.json
# Linux: ~/.local/share/com.evant.hierarchynotes/layout.json
```

**Solution**:
- Verify `persist_layout` Rust command is working
- Check file permissions on app data directory
- Look for JSON stringify errors in console

#### 4. Window Position Drift

**Problem**: Note windows slowly drift from their saved position

**Possible Causes**:
- Polling detecting false positives
- Rounding errors in position calculations
- OS window decorations not accounted for

**Solution**:
- Add dead zone to position comparison:
```typescript
const hasMoved = Math.abs(lastRect.x - currentRect.x) > 1 || 
                 Math.abs(lastRect.y - currentRect.y) > 1;
```
- Use `outerPosition` instead of `innerPosition`
- Increase polling interval if CPU usage is high

### Tauri-Specific Issues

#### 1. WebView2 Missing (Windows)

**Problem**: App won't launch on Windows

**Error**: "WebView2 Runtime not found"

**Solution**:
- Install WebView2 Runtime: https://developer.microsoft.com/microsoft-edge/webview2/
- Or run installer with `--bootstrapper` flag

#### 2. File Permissions (macOS)

**Problem**: Can't write to app data directory

**Solution**:
- Grant full disk access in System Preferences > Privacy
- Check code signing (may need to run `codesign --force --deep --sign - /path/to/app`)

#### 3. Linux Dependencies

**Problem**: Build fails on Linux

**Missing Dependencies**:
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.0-devel \
  openssl-devel \
  curl \
  wget \
  gtk3-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel

# Arch
sudo pacman -S webkit2gtk \
  base-devel \
  curl \
  wget \
  openssl \
  gtk3 \
  libappindicator-gtk3 \
  librsvg
```

### Performance Issues

#### 1. High CPU Usage

**Problem**: App uses excessive CPU

**Likely Cause**: Polling interval too aggressive

**Solution**:
- Increase polling interval in NotePage.tsx:
```typescript
// Change from 100ms to 250ms or 500ms
positionCheckInterval.current = window.setInterval(checkPosition, 250);
```

#### 2. Laggy Connector Rendering

**Problem**: Lines update slowly or jitter

**Likely Cause**: Too many re-renders

**Solution**:
- Check if `useMemo` dependencies in LinkLayer are correct
- Ensure note rects aren't creating new objects on every render
- Add React DevTools Profiler to identify bottlenecks

#### 3. Memory Leak

**Problem**: Memory usage grows over time

**Likely Cause**: Event listeners not cleaned up

**Solution**:
- Verify all `useEffect` cleanup functions return unlisten callbacks:
```typescript
useEffect(() => {
  const listeners: Array<() => void> = [];
  // ... setup listeners
  return () => {
    listeners.forEach(unlisten => unlisten());
  };
}, []);
```

### Development Tips

#### Hot Reload Not Working

**Problem**: Changes don't reflect in dev mode

**Solution**:
- Check Vite dev server is running on port 1420
- Ensure `beforeDevCommand` in tauri.conf.json is correct
- Try restarting with `npm run tauri:dev`

#### Rust Changes Not Applying

**Problem**: Backend changes not taking effect

**Solution**:
- Stop dev server
- Run `cargo clean` in `src-tauri` directory
- Restart `npm run tauri:dev`

#### IPC Events Not Firing

**Problem**: Events silently fail

**Debug**:
```typescript
// In ipc.ts, add logging to all emitters:
export function emitNoteMoved(payload: NoteMovedEvent): void {
  console.log('Emitting note:moved', payload);
  tauriEmit(IPC_EVENTS.NOTE_MOVED, payload);
}
```

### Testing Checklist

When debugging issues, verify:

- [ ] All dependencies installed (`npm install`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Vite dev server running (port 1420)
- [ ] Rust backend compiled (check `src-tauri/target`)
- [ ] Browser console for frontend errors
- [ ] Terminal/Rust console for backend errors
- [ ] App data directory exists and is writable
- [ ] WebView2 installed (Windows)
- [ ] System dependencies installed (Linux)

### Getting Help

If issues persist:

1. Check browser console for errors (F12 in Board window)
2. Check Rust console output in terminal
3. Verify `layout.json` exists and is valid JSON
4. Try deleting `layout.json` to reset
5. Try "Reset" button to restore sample data
6. Check Tauri documentation: https://tauri.app/
7. Create issue with:
   - OS and version
   - Node/npm version
   - Rust version
   - Error messages
   - Steps to reproduce

### Quick Fixes

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clean Rust build
cd src-tauri
cargo clean
cd ..
npm run tauri:dev

# Reset app data (CAUTION: deletes saved layout)
# Windows
del %APPDATA%\com.evant.hierarchynotes\layout.json

# macOS/Linux
rm ~/Library/Application\ Support/com.evant.hierarchynotes/layout.json
# or
rm ~/.local/share/com.evant.hierarchynotes/layout.json
```

### Known Workarounds

#### Note Windows Open Off-Screen

If note windows spawn outside visible area:
- Close all note windows
- Delete `layout.json`
- Restart app to regenerate sample layout

#### Theme Toggle Not Working

If theme button doesn't switch modes:
- Check `document.documentElement.classList` in console
- Verify `dark` class is being added/removed
- Check localStorage for `theme` key

#### Connectors Disappear

If lines vanish:
- Check if notes still exist in state
- Verify `LinkLayer` is rendering (inspect DOM for `<svg>`)
- Check if notes have valid rects (not NaN)

## Performance Optimization

For large numbers of notes (50+):

1. Increase debounce time: `250ms → 500ms`
2. Reduce polling frequency: `100ms → 250ms`
3. Add virtualization to Inspector (only render visible items)
4. Memoize more selectors in store
5. Consider throttling instead of debouncing for some events

## Security Notes

- App uses local file system only (no network)
- Data stored in OS-specific app data directory
- No external API calls or telemetry
- Safe to use for sensitive notes

