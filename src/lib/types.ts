// Core type definitions for multi-window board application

export type ID = string;

export type NoteRect = { 
  x: number; 
  y: number; 
  width: number; 
  height: number;
};

export type NoteWindow = {
  id: ID;
  title: string;
  content: string;
  rect: NoteRect;
  z: number;
  color?: string;         // muted accent color
  isOpen: boolean;        // whether native window exists
  hidden?: boolean;       // board visibility toggle
};

// === Future-facing target reference (stub; not used yet) ===
export type SubtaskRef = {
  noteId: ID;
  // e.g., a stable identifier for a subtask inside a note; not implemented yet
  subtaskId: string;
};

// Link endpoints can be a Note or (future) a Subtask within a Note
export type LinkEndpoint =
  | { kind: 'note'; id: ID }
  | { kind: 'subtask'; ref: SubtaskRef }; // reserved for future

export type Link = {
  id: ID;
  source: LinkEndpoint;          // replaces sourceId
  target: LinkEndpoint;          // replaces targetId
  directed?: boolean;            // parent -> child when true
  label?: string;
};

export type UIMode = 'select' | 'connect';
export type ConnectStyle = 'smooth' | 'orthogonal';

export type UIState = {
  mode: UIMode;
  snapToGrid: boolean;            // board-level snap (visual)
  connectStyle: ConnectStyle;
  selectedNoteIds: ID[];
  selectedLinkIds: ID[];
  gridDensity: number;            // in pixels
  focusedNoteId?: ID | null;
  sidebarCollapsed?: boolean;
  trash?: {
    lastDeleted?: {
      note: NoteWindow; // store full note for restoration
      deletedAt: number;
    };
  };
  windows: {
    showConnections: boolean;     // controls WindowLinkLayer visibility (separate from board links)
  };
};

export type BoardState = {
  notes: Record<ID, NoteWindow>;
  links: Record<ID, Link>;
  ui: UIState;
};

// IPC event payloads
export type SpawnNotePayload = {
  id: ID;
  rect: NoteRect;
};

export type FocusNotePayload = {
  id: ID;
};

export type CloseNotePayload = {
  id: ID;
};

export type PersistLayoutPayload = {
  boardState: BoardState;
};

export type NoteMovedEvent = {
  id: ID;
  rect: NoteRect;
};

export type NoteResizedEvent = {
  id: ID;
  rect: NoteRect;
};

export type NoteFocusedEvent = {
  id: ID;
};

export type NoteBlurredEvent = {
  id: ID;
};

export type NoteClosedEvent = {
  id: ID;
};

export type NoteContentChangedEvent = {
  id: ID;
  title?: string;
  content?: string;
};

export type NoteHydrateEvent = {
  id: ID;
  title: string;
  content: string;
  color?: string;
};

// Handshake readiness from Note → Board
export type NoteReadyPayload = {
  id: ID; // the label id used by Board/IPC
};

// Utilities for tests
export function nextZ(notes: NoteWindow[]): number {
  if (!notes || notes.length === 0) return 1;
  const maxZ = Math.max(0, ...notes.map((n) => n.z ?? 0));
  return maxZ + 1;
}

// Generic Note type (board-facing) compatible with NoteWindow
export type Note = {
  id: ID;
  title: string;
  color?: string;
  window?: { isOpen: boolean };
  // Other fields like rect/z may exist on NoteWindow
};

// Geometry types
export type Point = {
  x: number;
  y: number;
};

export type Anchor = 'top' | 'bottom' | 'left' | 'right';

export type AnchorPoint = {
  point: Point;
  anchor: Anchor;
};

