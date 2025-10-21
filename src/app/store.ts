// Zustand store for Board state management (multi-window aware)

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { BoardState, NoteWindow, Link, NoteRect, ID, UIMode, ConnectStyle } from '../lib/types';
import { saveBoardState } from './persistence';
import { debounce } from '../lib/utils';
import { spawnNoteWindow, closeNoteWindow, focusNoteWindow, onNoteReady, emitNoteHydrate } from './ipc';

interface BoardStoreState extends BoardState {
  // Actions
  createNote: (rect?: Partial<NoteRect>) => Promise<void>;
  renameNote: (id: ID, title: string) => void;
  openNoteWindow: (id: ID) => Promise<void>;
  closeNoteWindowAction: (id: ID) => Promise<void>;
  toggleNoteWindow: (id: ID) => Promise<void>;
  updateNoteRect: (id: ID, rect: NoteRect) => void;
  updateNoteContent: (id: ID, updates: { title?: string; content?: string }) => void;
  updateNoteWindow: (id: ID, updates: Partial<NoteWindow>) => void;
  deleteNote: (id: ID) => Promise<void>;
  undoDelete: () => Promise<void>;
  markNoteClosedFromOS: (id: ID) => void;
  setNoteOpen: (id: ID, isOpen: boolean) => void;
  bringNoteToFront: (id: ID) => void;

  createLink: (sourceId: ID, targetId: ID) => void;
  deleteLink: (id: ID) => void;

  setMode: (mode: UIMode) => void;
  toggleSnapToGrid: () => void;
  setConnectStyle: (style: ConnectStyle) => void;
  setSelectedNotes: (ids: ID[]) => void;
  setSelectedLinks: (ids: ID[]) => void;
  toggleNoteSelection: (id: ID) => void;
  clearSelection: () => void;
  setGridDensity: (density: number) => void;
  toggleSidebar: () => void;
  // Drag echo block to avoid polling feedback after we move OS window
  setDragEchoBlock: (id: ID, ms: number) => void;
  dragEchoBlock: Record<string, number>;

  initializeFromState: (state: BoardState) => void;
  resetToSampleLayout: () => void;

  // Selectors
  selectAllNotes: () => NoteWindow[];
  selectNoteById: (id: ID) => NoteWindow | undefined;
  persistNow: () => Promise<void>;
  toggleNoteHidden: (id: ID) => void;
}

// Debounced persist function
const debouncedPersist = debounce((state: BoardState) => {
  saveBoardState(state);
}, 250);

// Track in-flight window spawns to avoid duplicate spawns under StrictMode
const inflightOpens = new Set<string>();

export const useBoardStore = create<BoardStoreState>()(
  immer((set, get) => ({
    // Initial state
    notes: {},
    links: {},
    ui: {
      mode: 'select',
      snapToGrid: true,
      connectStyle: 'smooth',
      selectedNoteIds: [],
      selectedLinkIds: [],
      gridDensity: 40,
      focusedNoteId: null,
      trash: {},
      sidebarCollapsed: false,
    },
    dragEchoBlock: {},

    // Note actions
    createNote: async (rectOverrides = {}) => {
      const id = nanoid();
      const maxZ = Math.max(0, ...Object.values(get().notes).map((n) => n.z));

      const note: NoteWindow = {
        id,
        title: `Note ${Object.keys(get().notes).length + 1}`,
        content: '',
        rect: {
          x: 200 + Math.random() * 300,
          y: 200 + Math.random() * 200,
          width: 300,
          height: 200,
          ...rectOverrides,
        },
        z: maxZ + 1,
        isOpen: false,
      };

      set((state) => {
        state.notes[id] = note;
      });

      // Spawn the OS window
      await get().openNoteWindow(id);

      debouncedPersist(get());
    },

    renameNote: (id: ID, title: string) => {
      set((state) => {
        if (state.notes[id]) {
          state.notes[id].title = title;
        }
      });
      debouncedPersist(get());
    },

    openNoteWindow: async (id: ID) => {
      const openingKey = `open:${id}`;
      if (inflightOpens.has(openingKey)) {
        console.log('[Store] openNoteWindow already in-flight for', id);
        return;
      }
      inflightOpens.add(openingKey);

      // Use the exact id key present in state
      const note = get().notes[id];
      console.log('[Store] openNoteWindow called for:', id, 'note:', note);
      if (!note) {
        console.warn('[Store] Note not found:', id);
        inflightOpens.delete(openingKey);
        return;
      }
      if (note.isOpen) {
        console.log('[Store] Note window already open:', id);
        inflightOpens.delete(openingKey);
        return;
      }

      try {
        console.log('[Store] Spawning window for note:', id, 'rect:', note.rect);
        await spawnNoteWindow({ id, rect: note.rect });

        // Wait for note:ready handshake, retry once
        const waitForNoteReady = (noteId: string, ms: number) => new Promise<void>((resolve, reject) => {
          let unlisten: (() => void) | null = null;
          const timer = window.setTimeout(() => {
            if (unlisten) unlisten();
            reject(new Error('note:ready timeout'));
          }, ms);
          onNoteReady(({ id: got }) => {
            if (got === noteId) {
              window.clearTimeout(timer);
              if (unlisten) unlisten();
              resolve();
            }
          }).then((off) => { unlisten = off; });
        });

        try {
          await waitForNoteReady(id, 2000);
        } catch (e) {
          await spawnNoteWindow({ id, rect: note.rect });
          await waitForNoteReady(id, 2000);
        }

        // Send hydration payload
        const current = get().notes[id];
        if (current) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Store] emitNoteHydrate after spawn', { id, rect: current.rect });
          }
          emitNoteHydrate({ id, title: current.title, content: current.content, color: current.color });
        }

        set((state) => {
          state.notes[id].isOpen = true;
          state.ui.focusedNoteId = id;
        });
        console.log('[Store] Note window spawned and hydrated:', id);
      } catch (error) {
        console.error('[Store] Failed to open note window:', id, error);
      } finally {
        inflightOpens.delete(openingKey);
      }
    },

    closeNoteWindowAction: async (id: ID) => {
      const note = get().notes[id];
      if (!note) return;
      if (!note.isOpen) return;
      try {
        await closeNoteWindow({ id });
        set((state) => {
          if (state.notes[id]) state.notes[id].isOpen = false;
        });
        debouncedPersist(get());
      } catch (error) {
        console.error('[Store] Failed to close note window:', id, error);
      }
    },

    toggleNoteWindow: async (id: ID) => {
      const note = get().notes[id];
      if (!note) return;
      if (note.isOpen) {
        await get().closeNoteWindowAction(id);
      } else {
        await get().openNoteWindow(id);
        // Focus after opening
        focusNoteWindow({ id }).catch(console.error);
      }
    },

    updateNoteRect: (id: ID, rect: NoteRect, opts?: { fromDrag?: boolean }) => {
      set((state) => {
        if (!opts?.fromDrag) {
          const until = (state as any).dragEchoBlock?.[id] || 0;
          if (Date.now() < until) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[Store] updateNoteRect ignored due to echo block', id, rect);
            }
            return state;
          }
        }
        const note = state.notes[id];
        if (note) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Store] updateNoteRect', id, rect);
          }
          note.rect = rect;
        } else if (process.env.NODE_ENV !== 'production') {
          console.warn('[Store] updateNoteRect: note not found for id', id, Object.keys(state.notes));
        }
      });
      debouncedPersist(get());
    },

    updateNoteContent: (id: ID, updates: { title?: string; content?: string }) => {
      set((state) => {
        if (state.notes[id]) {
          if (updates.title !== undefined) state.notes[id].title = updates.title;
          if (updates.content !== undefined) state.notes[id].content = updates.content;
        }
      });
      debouncedPersist(get());
    },

    updateNoteWindow: (id: ID, updates: Partial<NoteWindow>) => {
      set((state) => {
        if (state.notes[id]) {
          Object.assign(state.notes[id], updates);
        }
      });
      debouncedPersist(get());
    },

    toggleNoteHidden: (id: ID) => {
      set((state) => {
        if (state.notes[id]) {
          state.notes[id].hidden = !state.notes[id].hidden;
        }
      });
    },

    deleteNote: async (id: ID) => {
      const note = get().notes[id];
      if (!note) return;

      // Close the window if open
      if (note.isOpen) {
        await get().closeNoteWindowAction(id);
      }

      set((state) => {
        // Delete the note
        const deleted = state.notes[id];
        delete state.notes[id];

        // Place into trash buffer
        if (!state.ui.trash) state.ui.trash = {} as any;
        state.ui.trash.lastDeleted = { note: deleted, deletedAt: Date.now() };

        // Delete related links
        Object.keys(state.links).forEach((linkId) => {
          const link = state.links[linkId];
          if (link.sourceId === id || link.targetId === id) {
            delete state.links[linkId];
          }
        });

        // Remove from selection
        state.ui.selectedNoteIds = state.ui.selectedNoteIds.filter((nId) => nId !== id);
      });

      debouncedPersist(get());
    },

    undoDelete: async () => {
      const last = get().ui.trash?.lastDeleted;
      if (!last) return;
      set((state) => {
        state.notes[last.note.id] = last.note;
        if (state.ui.trash) state.ui.trash.lastDeleted = undefined;
      });
      debouncedPersist(get());
    },

    markNoteClosedFromOS: (id: ID) => {
      set((state) => {
        if (state.notes[id]) {
          state.notes[id].isOpen = false;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Store] markNoteClosedFromOS', id);
          }
        }
      });
      debouncedPersist(get());
    },

    setNoteOpen: (id: ID, isOpen: boolean) => {
      set((state) => {
        if (state.notes[id]) {
          state.notes[id].isOpen = isOpen;
        }
      });
    },

    bringNoteToFront: (id: ID) => {
      const note = get().notes[id];
      if (!note) return;

      const maxZ = Math.max(0, ...Object.values(get().notes).map((n) => n.z ?? 0));
      if (note.z < maxZ) {
        set((state) => {
          state.notes[id].z = maxZ + 1;
          state.ui.focusedNoteId = id;
        });
        debouncedPersist(get());
      } else {
        set((state) => {
          state.ui.focusedNoteId = id;
        });
        debouncedPersist(get());
      }

      // Also focus the window
      if (note.isOpen) {
        focusNoteWindow({ id }).catch(console.error);
      }
    },

    // Link actions
    createLink: (sourceId: ID, targetId: ID) => {
      // Check if link already exists
      const existingLink = Object.values(get().links).find(
        (link) =>
          (link.sourceId === sourceId && link.targetId === targetId) ||
          (link.sourceId === targetId && link.targetId === sourceId)
      );

      if (existingLink) return;

      const id = nanoid();
      const link: Link = {
        id,
        sourceId,
        targetId,
        directed: true,
      };

      set((state) => {
        state.links[id] = link;
      });

      debouncedPersist(get());
    },

    deleteLink: (id: ID) => {
      set((state) => {
        delete state.links[id];
        state.ui.selectedLinkIds = state.ui.selectedLinkIds.filter((lId) => lId !== id);
      });
      debouncedPersist(get());
    },

    // UI actions
    setMode: (mode: UIMode) => {
      set((state) => {
        state.ui.mode = mode;
      });
    },

    toggleSnapToGrid: () => {
      set((state) => {
        state.ui.snapToGrid = !state.ui.snapToGrid;
      });
    },

    setConnectStyle: (style: ConnectStyle) => {
      set((state) => {
        state.ui.connectStyle = style;
      });
    },

    setSelectedNotes: (ids: ID[]) => {
      set((state) => {
        state.ui.selectedNoteIds = ids;
      });
    },

    setSelectedLinks: (ids: ID[]) => {
      set((state) => {
        state.ui.selectedLinkIds = ids;
      });
    },

    toggleNoteSelection: (id: ID) => {
      set((state) => {
        const idx = state.ui.selectedNoteIds.indexOf(id);
        if (idx >= 0) {
          state.ui.selectedNoteIds.splice(idx, 1);
        } else {
          state.ui.selectedNoteIds.push(id);
        }
      });
    },

    clearSelection: () => {
      set((state) => {
        state.ui.selectedNoteIds = [];
        state.ui.selectedLinkIds = [];
      });
    },

    setGridDensity: (density: number) => {
      set((state) => {
        state.ui.gridDensity = density;
      });
    },

    toggleSidebar: () => {
      set((state) => {
        state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
      });
    },

    setDragEchoBlock: (id: ID, ms: number) => {
      set((state) => {
        (state as any).dragEchoBlock = (state as any).dragEchoBlock || {};
        (state as any).dragEchoBlock[id] = Date.now() + ms;
      });
    },

    // State management
    initializeFromState: (state: BoardState) => {
      set(() => state);
    },

    resetToSampleLayout: () => {
      // This will be called from the Board component with sample data
      set((state) => {
        // Close all existing windows
        Object.keys(state.notes).forEach((id) => {
          if (state.notes[id].isOpen) {
            closeNoteWindow({ id }).catch(console.error);
          }
        });

        // Reset will be done externally by reloading sample data
      });
    },
  }))
);

// Simple selectors for components (inline selectors preferred for Zustand to avoid re-render issues)
export const selectAllNotes = () => Object.values(useBoardStore.getState().notes);
export const selectNoteById = (id: ID) => useBoardStore.getState().notes[id];
export const persistNow = async () => {
  await saveBoardState(useBoardStore.getState());
};
