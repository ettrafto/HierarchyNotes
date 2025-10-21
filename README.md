# HierarchyNotes - Multi-Window Note-Taking Application

A local desktop application built with Tauri v2, React, TypeScript, and Zustand. Each note is a native OS window, and the Board window displays real-time relationship lines between notes.

## Features

- **True Multi-Window Architecture**: Each note runs in its own native OS window
- **Live Connectors**: Board displays relationship lines that update in real-time as windows move/resize
- **Local Persistence**: Layout automatically saved to `layout.json` in app data directory
- **Dark/Light Theme**: Beautiful minimal UI with dark mode by default
- **Smooth/Orthogonal Paths**: Toggle between different connector styles
- **Snap to Grid**: Optional grid snapping for organized layouts
- **Keyboard Shortcuts**: Fast workflow with keyboard support

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Architecture

### Directory Structure

```
src/
├── app/                    # Application core
│   ├── main.tsx           # Board window entry
│   ├── note-main.tsx      # Note window entry
│   ├── store.ts           # Zustand state management
│   ├── ipc.ts             # Typed IPC layer
│   ├── persistence.ts     # Local JSON storage
│   └── theme.ts           # Theme management
├── components/
│   ├── Board/             # Board window components
│   │   ├── Grid.tsx
│   │   ├── LinkLayer.tsx
│   │   ├── Topbar.tsx
│   │   ├── Toolbar.tsx
│   │   ├── Inspector.tsx
│   │   └── MiniMap.tsx
│   └── Note/              # Note window components
│       └── NoteShell.tsx
├── lib/                   # Utilities
│   ├── types.ts          # TypeScript types
│   ├── geometry.ts       # Anchor/rect calculations
│   ├── path.ts           # Path generation
│   └── utils.ts          # General utilities
├── pages/
│   ├── BoardPage.tsx     # Main board page
│   └── NotePage.tsx      # Note window page
└── styles/
    └── globals.css       # Tailwind + custom styles
```

### Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Tauri v2, Rust
- **State**: Zustand with Immer
- **Styling**: TailwindCSS
- **Icons**: lucide-react
- **Animation**: Framer Motion

### IPC Architecture

**Board ↔ Rust Commands:**
- `spawn_note_window`: Create new OS window
- `focus_note_window`: Bring window to front
- `close_note_window`: Close window
- `persist_layout`: Save to disk
- `load_layout`: Load from disk

**Note → Board Events:**
- `note:moved`: Window position changed
- `note:resized`: Window size changed
- `note:focused`: Window gained focus
- `note:closed`: Window closed
- `note:content_changed`: Content edited

**Board → Note Events:**
- `note:hydrate`: Initialize note data

## Keyboard Shortcuts

- `N` or `Cmd/Ctrl+N`: Create new note
- `G`: Toggle snap to grid
- `Delete/Backspace`: Delete selected notes/links
- `Cmd/Ctrl+K`: Search (coming soon)

## Persistence

Layout is automatically saved to:
- **Windows**: `%APPDATA%/com.evant.hierarchynotes/layout.json`
- **macOS**: `~/Library/Application Support/com.evant.hierarchynotes/layout.json`
- **Linux**: `~/.local/share/com.evant.hierarchynotes/layout.json`

## Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

## Sample Data

On first launch, the app creates 6 sample notes with various links to demonstrate the functionality. Use the "Reset" button to restore sample layout.

## Implementation Details

This refactor implements a true multi-window desktop application:

1. **Multi-Window System**: Uses Tauri's `WebviewWindowBuilder` to spawn separate OS windows for each note
2. **Real-Time Sync**: IPC events keep the Board in sync with note window positions and content
3. **Geometry Calculations**: Smart anchor point detection finds the nearest edges between notes
4. **Path Generation**: Bezier curves (smooth) or orthogonal right-angle paths
5. **Debounced Persistence**: Changes are saved automatically with a 250ms debounce
6. **Theme System**: CSS variables and Tailwind dark mode for consistent styling

## Future Enhancements

- Rich text editor (Markdown/WYSIWYG)
- Export to PNG/SVG
- Multi-monitor support improvements
- Search functionality
- Tags and filtering
- Collaborative features

## License

MIT
