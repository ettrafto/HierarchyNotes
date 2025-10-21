// Typed IPC helpers for communication between Board, Note windows, and Rust backend

import { invoke } from '@tauri-apps/api/core';
import { listen, emit as tauriEmit, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  SpawnNotePayload,
  FocusNotePayload,
  CloseNotePayload,
  PersistLayoutPayload,
  BoardState,
  NoteMovedEvent,
  NoteResizedEvent,
  NoteFocusedEvent,
  NoteBlurredEvent,
  NoteClosedEvent,
  NoteContentChangedEvent,
  NoteHydrateEvent,
  NoteReadyPayload,
} from '../lib/types';

// Event channel names
export const IPC_EVENTS = {
  // Board -> Rust
  SPAWN_NOTE: 'spawn_note_window',
  FOCUS_NOTE: 'focus_note_window',
  CLOSE_NOTE: 'close_note_window',
  PERSIST_LAYOUT: 'persist_layout',
  LOAD_LAYOUT: 'load_layout',

  // Note -> Board
  NOTE_MOVED: 'note:moved',
  NOTE_RESIZED: 'note:resized',
  NOTE_FOCUSED: 'note:focused',
  NOTE_BLURRED: 'note:blurred',
  NOTE_CLOSED: 'note:closed',
  NOTE_CONTENT_CHANGED: 'note:content_changed',
  NOTE_READY: 'note:ready',

  // Board -> Note
  NOTE_HYDRATE: 'note:hydrate',
  NOTE_REQUEST_FOCUS: 'note:request_focus',

  // Note -> Board (request hydration)
  NOTE_REQUEST_HYDRATE: 'note:request_hydrate',

  // Frontend-only persistence notifications
  PERSIST_OK: 'persist:ok',
  PERSIST_FAIL: 'persist:fail',
} as const;

// ============================================================================
// Board -> Rust invokes
// ============================================================================

export async function spawnNoteWindow(payload: SpawnNotePayload): Promise<void> {
  console.log('[IPC] spawnNoteWindow called with:', payload);
  try {
    // Ensure label normalization is handled in Rust; send id as-is
    await invoke('spawn_note_window', payload);
    console.log('[IPC] spawnNoteWindow completed for:', payload.id);
  } catch (error) {
    console.error('[IPC] Failed to spawn note window:', error);
    throw error;
  }
}

export async function focusNoteWindow(payload: FocusNotePayload): Promise<void> {
  try {
    await invoke('focus_note_window', payload);
  } catch (error) {
    console.error('Failed to focus note window:', error);
    throw error;
  }
}

export async function closeNoteWindow(payload: CloseNotePayload): Promise<void> {
  try {
    await invoke('close_note_window', payload);
  } catch (error) {
    console.error('Failed to close note window:', error);
    throw error;
  }
}

export async function persistLayout(payload: PersistLayoutPayload): Promise<void> {
  try {
    // Our Rust handler signature is persist_layout(app, board_state)
    // but tauri command expects the original key names from the frontend side
    // Ensure both formats are attempted (to cover env variations)
    try {
      await invoke('persist_layout', { board_state: payload.boardState });
    } catch (e) {
      await invoke('persist_layout', { boardState: payload.boardState });
    }
  } catch (error) {
    console.error('Failed to persist layout:', error);
    throw error;
  }
}

export async function loadLayout(): Promise<BoardState | null> {
  try {
    const result = await invoke<string>('load_layout');
    if (!result) return null;
    return JSON.parse(result) as BoardState;
  } catch (error) {
    console.error('Failed to load layout:', error);
    return null;
  }
}

// ============================================================================
// Event listeners (Board side)
// ============================================================================

export function onNoteMoved(handler: (event: NoteMovedEvent) => void): Promise<UnlistenFn> {
  return listen<NoteMovedEvent>(IPC_EVENTS.NOTE_MOVED, (e) => handler(e.payload));
}

export function onNoteResized(handler: (event: NoteResizedEvent) => void): Promise<UnlistenFn> {
  return listen<NoteResizedEvent>(IPC_EVENTS.NOTE_RESIZED, (e) => handler(e.payload));
}

export function onNoteFocused(handler: (event: NoteFocusedEvent) => void): Promise<UnlistenFn> {
  return listen<NoteFocusedEvent>(IPC_EVENTS.NOTE_FOCUSED, (e) => handler(e.payload));
}

export function onNoteBlurred(handler: (event: NoteBlurredEvent) => void): Promise<UnlistenFn> {
  return listen<NoteBlurredEvent>(IPC_EVENTS.NOTE_BLURRED, (e) => handler(e.payload));
}

export function onNoteClosed(handler: (event: NoteClosedEvent) => void): Promise<UnlistenFn> {
  return listen<NoteClosedEvent>(IPC_EVENTS.NOTE_CLOSED, (e) => handler(e.payload));
}

export function onNoteContentChanged(
  handler: (event: NoteContentChangedEvent) => void
): Promise<UnlistenFn> {
  return listen<NoteContentChangedEvent>(IPC_EVENTS.NOTE_CONTENT_CHANGED, (e) =>
    handler(e.payload)
  );
}

export function onNoteReady(handler: (event: NoteReadyPayload) => void): Promise<UnlistenFn> {
  return listen<NoteReadyPayload>(IPC_EVENTS.NOTE_READY, (e) => handler(e.payload));
}

// ============================================================================
// Event emitters (Note side)
// ============================================================================

export function emitNoteMoved(payload: NoteMovedEvent): void {
  tauriEmit(IPC_EVENTS.NOTE_MOVED, payload);
}

export function emitNoteResized(payload: NoteResizedEvent): void {
  tauriEmit(IPC_EVENTS.NOTE_RESIZED, payload);
}

export function emitNoteFocused(payload: NoteFocusedEvent): void {
  tauriEmit(IPC_EVENTS.NOTE_FOCUSED, payload);
}

export function emitNoteBlurred(payload: NoteBlurredEvent): void {
  tauriEmit(IPC_EVENTS.NOTE_BLURRED, payload);
}

export function emitNoteClosed(payload: NoteClosedEvent): void {
  tauriEmit(IPC_EVENTS.NOTE_CLOSED, payload);
}

export function emitNoteContentChanged(payload: NoteContentChangedEvent): void {
  tauriEmit(IPC_EVENTS.NOTE_CONTENT_CHANGED, payload);
}

export function emitNoteReady(payload: NoteReadyPayload): void {
  tauriEmit(IPC_EVENTS.NOTE_READY, payload);
}

// ============================================================================
// Note window listeners
// ============================================================================

export function onNoteHydrate(handler: (event: NoteHydrateEvent) => void): Promise<UnlistenFn> {
  return listen<NoteHydrateEvent>(IPC_EVENTS.NOTE_HYDRATE, (e) => handler(e.payload));
}

export function emitNoteHydrate(payload: NoteHydrateEvent): void {
  tauriEmit(IPC_EVENTS.NOTE_HYDRATE, payload);
}

// Note requests hydration from Board when ready
export function onNoteRequestHydrate(
  handler: (event: { id: string }) => void
): Promise<UnlistenFn> {
  return listen<{ id: string }>(IPC_EVENTS.NOTE_REQUEST_HYDRATE, (e) => handler(e.payload));
}

export function emitNoteRequestHydrate(payload: { id: string }): void {
  tauriEmit(IPC_EVENTS.NOTE_REQUEST_HYDRATE, payload);
}

// ============================================================================
// Persistence frontend notifications
// ============================================================================

export function onPersistOk(handler: () => void): Promise<UnlistenFn> {
  return listen<void>(IPC_EVENTS.PERSIST_OK, () => handler());
}

export function onPersistFail(handler: (error?: string) => void): Promise<UnlistenFn> {
  return listen<string | undefined>(IPC_EVENTS.PERSIST_FAIL, (e) => handler(e.payload));
}

export function emitPersistOk(): void {
  tauriEmit(IPC_EVENTS.PERSIST_OK);
}

export function emitPersistFail(error?: string): void {
  tauriEmit(IPC_EVENTS.PERSIST_FAIL, error);
}

