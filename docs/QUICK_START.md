# Quick Start Guide - HierarchyNotes

## ✅ Prerequisites Installed

- ✅ Node.js & npm
- ✅ Rust 1.90.0
- ✅ Cargo 1.90.0

## 🚀 First Time Setup (Currently Running)

The app is currently compiling. First-time compilation takes 3-5 minutes.

**What's happening:**
1. Vite dev server starting on port 1420
2. Rust backend compiling (~300+ dependencies on first run)
3. Tauri creating the application bundle

## 📱 What to Expect

Once compilation finishes, you'll see:

### Main Board Window
- **Size**: 1200x800 pixels
- **Background**: Dark theme with subtle grid
- **Features**: 
  - Topbar with "New Note", Search, Theme toggle, Reset
  - Toolbar with Select/Connect modes, Snap to Grid, Path style
  - Inspector panel for editing selected notes

### Note Windows (6 will open automatically)
- Each note is a **native OS window**
- Can be moved, resized independently
- Content is editable
- Closes individually with Ctrl+W or the X button

### Live Connectors
- Lines drawn between related notes
- **Updates in real-time** as you move/resize windows
- Toggle between Smooth (Bezier) and Orthogonal (right-angle) styles

## 🎮 Keyboard Shortcuts

- **N** or **Ctrl+N** - Create new note
- **G** - Toggle snap to grid
- **Delete/Backspace** - Delete selected notes/links
- **Ctrl+W** (in note window) - Close note

## 🎯 Try These Things

1. **Move a note window** - Watch the connector lines update in real-time
2. **Resize a note** - Lines adjust to optimal anchor points
3. **Click "New Note"** - Spawns a new OS window
4. **Toggle path style** - Switch between smooth curves and right angles
5. **Edit note content** - Changes save automatically
6. **Close app and reopen** - Layout is restored

## 📁 Data Location

Your layout is automatically saved to:
```
C:\Users\EvanT\AppData\Roaming\com.evant.hierarchynotes\layout.json
```

## 🐛 If Something Goes Wrong

### App won't start
```bash
# Refresh Rust PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Try again
npm run tauri:dev
```

### Note windows don't appear
- Check browser console (F12 in Board window) for errors
- Look at terminal output for Rust errors

### Connectors not updating
- Check if note windows are actually moving
- Verify IPC events in console: `note:moved`, `note:resized`

### Reset to sample data
- Click the "Reset" button in the Topbar
- Or delete `layout.json` from AppData and restart

## 🔄 Development Workflow

```bash
# Run in dev mode (hot reload)
npm run tauri:dev

# Type check
npm run typecheck

# Lint code
npm run lint

# Build for production
npm run tauri:build
```

## 📊 Current Status

**First-time compilation in progress...**

Check the terminal for:
- ✅ `Compiling ...` messages (Rust dependencies)
- ✅ `vite v7.0.4 dev server running at http://localhost:1420`
- ✅ Final message about app being ready

**Expected timeline:**
- Minute 0-1: Vite starts, downloads Rust dependencies
- Minute 1-4: Compiling Rust crates
- Minute 4-5: Building Tauri app, launching windows

## 🎉 Success Indicators

You'll know it worked when:
1. Main Board window opens (dark theme, grid background)
2. 6 note windows appear around the screen
3. Blue/purple connector lines visible between notes
4. You can drag a note window and see lines update

## 📚 Next Steps

Once running:
1. Explore the sample notes
2. Create a new note (click "New Note" or press N)
3. Try moving and resizing windows
4. Toggle between smooth and orthogonal connector styles
5. Edit note content - it saves automatically
6. Close and reopen app to see persistence working

## 💡 Tips

- **Performance**: Polling checks window position every 100ms
- **Persistence**: Layout auto-saves 250ms after changes
- **Multi-monitor**: Works but may have edge cases
- **Theme**: Toggle between dark/light with moon/sun icon

## 🛠️ Architecture Highlights

- **Frontend**: React + TypeScript + Vite
- **State**: Zustand with Immer
- **Styling**: TailwindCSS
- **Backend**: Tauri v2 + Rust
- **IPC**: Custom typed event system
- **Windows**: Native OS windows via Tauri WebviewWindowBuilder

Enjoy exploring HierarchyNotes! 🎨📝


