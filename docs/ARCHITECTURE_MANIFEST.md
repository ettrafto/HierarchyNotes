# HierarchyNotes – Architecture Manifest (Tauri v2 + React + TS)

This document captures the current architecture to guide planning, debugging, and prompting AI assistance.

## 1) Product Shape
- Main Board (hub) window renders grid + UI chrome + live connectors.
- Each Note is a native OS window (Tauri Webview), with title + content.
- Board holds the source of truth; Notes are dumb UI, reporting events.

## 2) Tech Stack
- Desktop: Tauri v2 (WebviewWindowBuilder)
- Frontend: React + Vite + TypeScript
- State: Zustand (+ Immer)
- Styling: TailwindCSS (+ tailwind-merge)
- Icons: lucide-react

## 3) Key Conventions
- Note identifiers:
  - Store key (rawId): e.g., "4".
  - Window label (labelId): e.g., "note-4".
  - IPC events use labelId for Note windows; Board maps labelId → rawId to lookup store.
- Window labels: Rust always spawns Note windows with labelId = "note-" + rawId.
- Dark theme by default; grid background via CSS repeating-linear-gradients.

## 4) File Map (important)
- `index.html` – Board entry; `note.html` – Note entry
- `src/app/main.tsx` – Boot Board window
- `src/app/note-main.tsx` – Boot Note window
- `src/app/store.ts` – Zustand Board store (source of truth)
- `src/app/ipc.ts` – Typed IPC helpers (invoke + events)
- `src/app/persistence.ts` – Load/save board state (JSON via invoke)
- `src/app/theme.ts` – Theme bootstrap
- `src/components/Board/` – Grid, LinkLayer, Topbar, Toolbar, Inspector, MiniMap
- `src/components/Note/NoteShell.tsx` – Note UI
- `src/pages/BoardPage.tsx` – Board page; init, events, layout
- `src/pages/NotePage.tsx` – Note page; hydration + OS events
- `src/lib/types.ts` – Shared types
- `src/lib/geometry.ts` – Anchor/rect utilities
- `src/lib/path.ts` – Smooth/orthogonal path builders
- `src-tauri/src/lib.rs` – Tauri commands + window creation + persistence
- `src-tauri/capabilities/default.json` – v2 capability allow-list (main + note-*)

## 5) State Schema (src/lib/types.ts)
```
ID = string
NoteRect = { x, y, width, height }
NoteWindow = { id: ID, title: string, content: string, rect: NoteRect, z: number, color?: string, isOpen: boolean }
Link = { id: ID, sourceId: ID, targetId: ID, directed?: boolean, label?: string }
UIState = { mode: 'select'|'connect', snapToGrid: boolean, connectStyle: 'smooth'|'orthogonal', selectedNoteIds: ID[], selectedLinkIds: ID[] }
BoardState = { notes: Record<ID, NoteWindow>, links: Record<ID, Link>, ui: UIState }
```
- Store notes keys are rawId (e.g., "4").
- Windows are labeled as labelId (e.g., "note-4").

## 6) IPC Contract
Commands (Board → Rust via `invoke`):
- `spawn_note_window({ id, rect })` – id is rawId; Rust builds labelId.
- `focus_note_window({ id })` – id is rawId; Rust focuses labelId.
- `close_note_window({ id })` – id is rawId; Rust closes labelId.
- `persist_layout({ boardState })` – saved to app data dir.
- `load_layout() -> BoardState | null` – returns serialized state or empty.

Events:
- Note → Board (via `@tauri-apps/api/event.emit`):
  - `note:moved { id: labelId, rect }`
  - `note:resized { id: labelId, rect }`
  - `note:focused { id: labelId }`, `note:blurred { id: labelId }`, `note:closed { id: labelId }`
  - `note:content_changed { id: labelId, title?, content? }`
  - `note:request_hydrate { id: labelId }` – Note asks Board for its data
- Board → Note:
  - `note:hydrate { id: labelId, title, content, color? }` – Board hydrates the matching Note window

ID rules in IPC:
- Note windows always emit/listen with labelId (e.g., "note-4").
- Board listens to request_hydrate(labelId) → maps to rawId to read store → emits hydrate(payload with id=labelId).

## 7) Lifecycle
Startup:
1. Board boots; loads layout via `load_layout()`.
2. If none, seeds sample data (6 notes, 6–7 links), sets `isOpen=false`.
3. Board opens windows for each note (rawId) via `spawn_note_window`.
4. Each Note mounts → attaches `note:hydrate` listener → emits `note:request_hydrate(labelId)`.
5. Board receives request → finds `notes[rawId]` → emits `note:hydrate(id=labelId, title, content, color)`.
6. Note receives hydrate (matching labelId) → renders content.

Persistence:
- Any store change schedules `persist_layout` (debounced 250ms).

Window events:
- Notes poll `outerPosition`/`outerSize` (100ms) and emit moved/resized to Board.
- Board updates `notes[rawId].rect`; LinkLayer re-computes connectors.

## 8) Rendering & Performance
- LinkLayer:
  - Memoizes link paths; derives nearest anchors from note rects.
  - Style switch: smooth (cubic bezier) or orthogonal.
- SVG layers: Grid (bottom) → LinkLayer → Inspector/UI (top).
- Zustand subscriptions use stable selectors; avoid returning new objects per render.

## 9) Security / Tauri Capabilities (v2)
`src-tauri/capabilities/default.json`:
- `windows`: ["main", "note-*"]
- `permissions`:
  - `core:default`, `opener:default`
  - `core:event:allow-listen`, `core:event:allow-emit`
  - `core:window:allow-outer-position`, `core:window:allow-outer-size`

## 10) Known Edge Cases / Decisions
- StrictMode double-invocation: guarded with an in-flight Set for window spawns.
- ID consistency: events use labelId; Board maps to rawId for store lookups.
- Polling: using 100ms; can be tuned to 250–500ms to lower CPU.

## 11) Operational Scripts
- `npm run tauri:dev` – Dev mode (Vite + Tauri)
- `npm run tauri:build` – Production build
- `npm run typecheck` – TS type check
- `setup-msvc-env.ps1` – Adds MSVC & SDK to PATH (Windows)

## 12) Next Steps (Roadmap)
- Improve hydration resiliency: batch open + hydrate, and window-open ACK.
- Add Board minimap and zoom/pan.
- Implement search (⌘K), select/connect mode UX refinements.
- Add link creation UI between notes from Board.
- Persist window z-order and focused state more precisely.
- Replace polling with native move/resize events (when available or via plugin).
- Add workspace import/export (JSON) and layout versions.
- Keyboard shortcuts help modal and onboarding.
- Tests: unit tests for geometry/path + e2e smoke via Playwright.

## 13) Debugging Cheatsheet
- Delete saved layout: `%APPDATA%/com.evant.hierarchynotes/layout.json`.
- Board console: verify `note:request_hydrate` found=true.
- Note console: should log `note:hydrate received` and `Hydrating`.
- If note stuck "Loading": check capabilities (listen/emit + outerPosition) and labelId vs id mismatch.

