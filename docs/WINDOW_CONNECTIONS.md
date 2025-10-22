# Window Connections Feature

## Overview
The Window Connections feature provides a separate visualization layer that shows parent→child connections **only** between notes that currently have their windows open. This is distinct from the Board's existing link rendering.

## Key Features

### 1. Separate Toggle
- **Location**: Toolbar (with Eye/EyeOff icon + "Window Links" label)
- **State**: Independent from board link visibility
- **Default**: ON (enabled)
- **Persistence**: Saved with board state and migrated for existing layouts

### 2. Rendering Behavior
- **Visibility Rule**: Only renders links where BOTH the source AND target notes have `isOpen: true`
- **Style**: White lines, 2px width, 90% opacity with arrowheads pointing to children
- **Path Logic**: Reuses the board's `connectStyle` (smooth/orthogonal) and geometry utilities
- **Z-Index**: 5 (above Grid, below regular LinkLayer which is at 10)

### 3. Live Updates
- Lines automatically update when:
  - Windows are opened/closed
  - Windows are moved/resized
  - Window z-order changes
- Uses the same reactive system as the board's link layer

### 4. Zero Regressions
- Board's LinkLayer remains unchanged
- Board's link toggle controls only the LinkLayer
- Window Links toggle controls only the WindowLinkLayer
- Both layers can be shown simultaneously or independently

## Architecture

### New Components
- **`src/components/Board/WindowLinkLayer.tsx`**: SVG overlay that renders window-only connections
  - Listens to `notes`, `links`, `ui.windows.showConnections`, and `ui.connectStyle`
  - Filters links where both endpoints have `isOpen: true`
  - Reuses `nearestAnchors()` and `buildPath()` from existing geometry/path utilities

### State Changes
- **`src/lib/types.ts`**: Extended `UIState` with `windows: { showConnections: boolean }`
- **`src/app/store.ts`**: Added `toggleWindowConnections()` action
- **`src/app/persistence.ts`**: Added migration logic for new UI state field

### UI Changes
- **`src/components/Board/Toolbar.tsx`**: Added "Window Links" toggle button with Eye/EyeOff icon
- **`src/pages/BoardPage.tsx`**: Mounted `WindowLinkLayer` between `Grid` and `NoteGhosts`

## Usage

### For End Users
1. Create connections between notes using the "Connect" mode
2. Open note windows (double-click ghosts on board)
3. Toggle "Window Links" in the toolbar to show/hide connections between open windows
4. The window connections update in real-time as you move, resize, or close windows

### For Developers
```typescript
// Access window connections state
const showWindowConnections = useBoardStore(state => state.ui.windows.showConnections);

// Toggle window connections
const toggleWindowConnections = useBoardStore(state => state.toggleWindowConnections);

// Check if a link should be visible in WindowLinkLayer
const shouldShow = sourceNote.isOpen && targetNote.isOpen && ui.windows.showConnections;
```

## Future Enhancements
- Add separate style settings for window connections (currently reuses board's `connectStyle`)
- Add hover/selection interactions for window connections
- Add option to show different visual styles (e.g., dashed lines) to distinguish from board links
- Support sub-task linking when that feature is implemented

## Testing Checklist
✅ Toggle shows/hides window connections independently from board links
✅ Connections only appear when both linked notes have open windows
✅ Connections disappear when either window is closed
✅ Connections update smoothly when windows move/resize
✅ State persists across app restarts
✅ Migration works for existing saved layouts (adds default `windows.showConnections: true`)
✅ No regressions to existing board link functionality

