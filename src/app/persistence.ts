// Persistence layer for saving/loading board state to local JSON file

import type { BoardState } from '../lib/types';
import { loadLayout, persistLayout } from './ipc';
import { emitPersistOk, emitPersistFail } from './ipc';

/**
 * Load the board state from disk via Rust backend
 */
export async function loadBoardState(): Promise<BoardState | null> {
  try {
    const state = await loadLayout();
    if (!state) return null;
    // Backward-compatible defaults: ensure z and focusedNoteId
    const notes = state.notes || {};
    const noteArray = Object.values(notes);
    if (noteArray.length > 0) {
      // Assign default z if missing based on index order
      noteArray.forEach((n, idx) => {
        if (typeof n.z !== 'number') n.z = idx + 1;
      });
      // Focused note default: highest z
      if (!state.ui) state.ui = {} as any;
      if (state.ui && (state.ui as any).focusedNoteId === undefined) {
        const top = noteArray.reduce((acc, n) => (n.z > acc.z ? n : acc), noteArray[0]);
        (state.ui as any).focusedNoteId = top?.id ?? null;
      }
    }
    return state as BoardState;
  } catch (error) {
    console.error('Failed to load board state:', error);
    return null;
  }
}

/**
 * Save the board state to disk via Rust backend
 */
export async function saveBoardState(boardState: BoardState): Promise<void> {
  try {
    await persistLayout({ boardState });
    emitPersistOk();
  } catch (error) {
    console.error('Failed to save board state:', error);
    emitPersistFail((error as Error)?.message);
  }
}

/**
 * Create initial sample data for first run
 */
export function createSampleData(): BoardState {
  return {
    notes: {
      'note-1': {
        id: 'note-1',
        title: 'Welcome to HierarchyNotes',
        content:
          'This is a sample note. You can edit the content, move and resize the window, and create links to other notes.',
        rect: { x: 100, y: 100, width: 300, height: 200 },
        z: 1,
        color: '#64748b',
        isOpen: false,
      },
      'note-2': {
        id: 'note-2',
        title: 'Project Goals',
        content:
          '- Multi-window support\n- Live connectors\n- Local persistence\n- Clean minimal UI',
        rect: { x: 500, y: 100, width: 280, height: 180 },
        z: 2,
        color: '#6366f1',
        isOpen: false,
      },
      'note-3': {
        id: 'note-3',
        title: 'Features',
        content:
          'Each note is a native OS window. The Board shows relationship lines that update in real-time.',
        rect: { x: 300, y: 350, width: 300, height: 160 },
        z: 3,
        color: '#8b5cf6',
        isOpen: false,
      },
      'note-4': {
        id: 'note-4',
        title: 'Architecture',
        content:
          'Built with Tauri v2, React, TypeScript, and Zustand for state management.',
        rect: { x: 700, y: 350, width: 280, height: 160 },
        z: 4,
        color: '#ec4899',
        isOpen: false,
      },
      'note-5': {
        id: 'note-5',
        title: 'Try It Out',
        content:
          'Press N to create a new note. Move and resize windows to see connectors update.',
        rect: { x: 100, y: 550, width: 280, height: 140 },
        z: 5,
        color: '#f59e0b',
        isOpen: false,
      },
      'note-6': {
        id: 'note-6',
        title: 'Persistence',
        content: 'Your layout is automatically saved and restored on app restart.',
        rect: { x: 500, y: 550, width: 280, height: 140 },
        z: 6,
        color: '#10b981',
        isOpen: false,
      },
    },
    links: {
      'link-1': {
        id: 'link-1',
        sourceId: 'note-1',
        targetId: 'note-2',
        directed: true,
      },
      'link-2': {
        id: 'link-2',
        sourceId: 'note-1',
        targetId: 'note-3',
        directed: true,
      },
      'link-3': {
        id: 'link-3',
        sourceId: 'note-2',
        targetId: 'note-4',
        directed: true,
      },
      'link-4': {
        id: 'link-4',
        sourceId: 'note-3',
        targetId: 'note-4',
        directed: false,
      },
      'link-5': {
        id: 'link-5',
        sourceId: 'note-3',
        targetId: 'note-5',
        directed: true,
      },
      'link-6': {
        id: 'link-6',
        sourceId: 'note-4',
        targetId: 'note-6',
        directed: true,
      },
      'link-7': {
        id: 'link-7',
        sourceId: 'note-5',
        targetId: 'note-6',
        directed: false,
      },
    },
    ui: {
      mode: 'select',
      snapToGrid: true,
      connectStyle: 'smooth',
      selectedNoteIds: [],
      selectedLinkIds: [],
      gridDensity: 40,
    },
  };
}

