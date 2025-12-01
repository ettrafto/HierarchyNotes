// Zustand store for Board state management (multi-window aware)
// Normalized state with stable selectors for instant UI updates

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { BoardState, NoteWindow, Link, NoteRect, ID, UIMode, ConnectStyle, WindowStyle } from '../lib/types';
import { saveBoardState } from './persistence';
import { debounce } from '../lib/utils';
import { spawnNoteWindow, closeNoteWindow, focusNoteWindow, onNoteReady, emitNoteHydrate } from './ipc';
import { debug } from '../lib/debug';

// ---------- Types ----------
type NotesById = Record<string, NoteWindow>;

type NormalizedBoard = {
  notesById: NotesById;
  noteIds: string[];      // stable UI order
  links: Record<string, Link>;
  ui: {
    mode: UIMode;
    snapToGrid: boolean;
    connectStyle: ConnectStyle;
    selectedNoteIds: ID[];
    selectedLinkIds: ID[];
    gridDensity: number;
    focusedNoteId: ID | null;
    trash: Record<string, any>;
    sidebarCollapsed: boolean;
    windows: {
      showConnections: boolean;
      style: WindowStyle;
    };
    resizeDrafts: Record<string, NoteRect>;
  };
};

interface LinkingDraft {
  sourceNoteId: ID | null;
}

interface BoardStoreState extends NormalizedBoard {
  linkingDraft: LinkingDraft;
  
  // Modal state
  uiModalEditNote: { id: string } | null;
  uiDeleteConfirmation: { noteId: string; noteTitle: string; noteIsOpen: boolean } | null;
  
  // Drag echo block to avoid polling feedback after we move OS window
  dragEchoBlock: Record<string, number>;
  
  // Actions
  createNote: (rect?: Partial<NoteRect>) => Promise<void>;
  renameNote: (id: ID, title: string) => void;
  openNoteWindow: (id: ID) => Promise<void>;
  closeNoteWindowAction: (id: ID) => Promise<void>;
  toggleNoteWindow: (id: ID) => Promise<void>;
  updateNoteRect: (id: ID, rect: NoteRect) => void;
  updateNoteContent: (id: ID, updates: { title?: string; content?: string }) => void;
  updateNoteWindow: (id: ID, updates: Partial<NoteWindow>) => void;
  updateNote: (id: ID, updates: Partial<NoteWindow>) => void;
  deleteNote: (id: ID) => Promise<void>;
  undoDelete: () => Promise<void>;
  markNoteClosedFromOS: (id: ID) => void;
  setNoteOpen: (id: ID, isOpen: boolean) => void;
  bringNoteToFront: (id: ID) => void;
  
  // Modal actions
  openEditModal: (id: ID) => void;
  closeEditModal: () => void;
  openDeleteConfirmation: (noteId: ID, noteTitle: string, noteIsOpen: boolean) => void;
  closeDeleteConfirmation: () => void;
  confirmDelete: (noteId: ID) => Promise<void>;

  // Link actions (new)
  startConnect: (sourceNoteId: ID) => void;
  completeConnect: (targetNoteId: ID) => void;
  cancelConnect: () => void;
  addDirectedLink: (parentId: ID, childId: ID) => ID;
  removeLink: (linkId: ID) => void;
  
  // Link actions (legacy)
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
  toggleWindowConnections: () => void;
  cycleWindowStyle: () => void;
  setWindowStyle: (style: WindowStyle) => void;
  setNoteActive: (id: ID, active: boolean) => void;
  setDragEchoBlock: (id: ID, ms: number) => void;

  // Board-side resize actions
  beginResizeDraft: (id: ID, rect: NoteRect) => void;
  updateResizeDraft: (id: ID, rect: NoteRect) => void;
  commitResizeDraft: (id: ID) => NoteRect | undefined;
  cancelResizeDraft: (id: ID) => void;
  setNoteRect: (id: ID, rect: NoteRect) => void;

  initializeFromState: (state: BoardState) => void;
  resetToSampleLayout: () => void;

  // Selectors
  selectAllNotes: () => NoteWindow[];
  selectNoteById: (id: ID) => NoteWindow | undefined;
  persistNow: () => Promise<void>;
  toggleNoteHidden: (id: ID) => void;
  
  // Ordering
  setNoteOrder: (ids: ID[]) => void;
  
  // Version bump to trigger dependent UIs
  __version: number;
  __bump: () => void;
}

// ---------- Helpers ----------
function removeFromArray<T>(arr: T[], value: T) {
  const i = arr.indexOf(value);
  if (i >= 0) arr.splice(i, 1);
}

// For old schema compatibility:
// - old: { notes: Record<ID, NoteWindow>, links, ui }
// - new: { notesById, noteIds }
export function migrateToNormalized(old: Partial<BoardState>): NormalizedBoard {
  if (!old || !old.notes) {
    return {
      notesById: {},
      noteIds: [],
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
        windows: {
          showConnections: true,
          style: 'glass',
        },
        resizeDrafts: {},
      },
    };
  }
  
  const notesById: NotesById = {};
  const noteIds: string[] = [];
  for (const id of Object.keys(old.notes)) {
    notesById[id] = { ...old.notes[id] };
    noteIds.push(id);
  }
  
  return {
    notesById,
    noteIds,
    links: old.links ?? {},
    ui: old.ui ?? {
      mode: 'select',
      snapToGrid: true,
      connectStyle: 'smooth',
      selectedNoteIds: [],
      selectedLinkIds: [],
      gridDensity: 40,
      focusedNoteId: null,
      trash: {},
      sidebarCollapsed: false,
      windows: {
        showConnections: true,
        style: 'glass',
      },
      resizeDrafts: {},
    },
  };
}

// Debounced persist function
const debouncedPersist = debounce((state: BoardState) => {
  saveBoardState(state);
}, 250);

// Track in-flight window spawns to avoid duplicate spawns under StrictMode
const inflightOpens = new Set<string>();

// Guard to prevent feedback loops when the Board resizes a Note window
export const resizingViaBoard = new Set<string /* rawId */>();

export const useBoardStore = create<BoardStoreState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial normalized state
      notesById: {},
      noteIds: [],
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
        windows: {
          showConnections: true,
          style: 'glass',
        },
        resizeDrafts: {},
      },
      dragEchoBlock: {},
      linkingDraft: { sourceNoteId: null },
      uiModalEditNote: null,
      uiDeleteConfirmation: null,
      __version: 0,
      __bump: () => set(s => { s.__version++; }),

      // Note actions
      createNote: async (rectOverrides = {}) => {
        const id = nanoid();
        const maxZ = Math.max(0, ...get().noteIds.map(id => get().notesById[id]?.z || 0));

        const note: NoteWindow = {
          id,
          title: `Note ${get().noteIds.length + 1}`,
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
          isActive: true,
        };

        set((state) => {
          state.notesById[id] = note;
          state.noteIds.push(id);
        });

        // Spawn the OS window
        await get().openNoteWindow(id);

        debouncedPersist(get());
      },

      renameNote: (id: ID, title: string) => {
        set((state) => {
          if (state.notesById[id]) {
            state.notesById[id].title = title;
          }
        });
        debouncedPersist(get());
      },

      openNoteWindow: async (id: ID) => {
        const openingKey = `open:${id}`;
        if (inflightOpens.has(openingKey)) {
          debug.log('STORE', '[Store] openNoteWindow already in-flight for', id);
          return;
        }
        inflightOpens.add(openingKey);

        try {
          const note = get().notesById[id];
          if (!note) {
            debug.warn('STORE', '[Store] openNoteWindow called for non-existent note:', id);
            return;
          }

          debug.log('WINDOW_LIFECYCLE', '[Store] openNoteWindow called for:', id, { wasOpen: note.isOpen });
          if (note.isOpen) {
            debug.log('WINDOW_LIFECYCLE', '[Store] Note already open, focusing instead');
            await focusNoteWindow({ id });
            return;
          }

          // Wait for note:ready(id) event before proceeding
          const waitForNoteReady = (id: string, ms: number): Promise<void> => {
            return new Promise((resolve, reject) => {
              let unlisten: (() => void) | null = null;
              const timer = window.setTimeout(() => {
                if (unlisten) unlisten();
                reject(new Error('note:ready timeout'));
              }, ms);
              onNoteReady(({ id: got }) => {
                if (got === id) {
                  window.clearTimeout(timer);
                  if (unlisten) unlisten();
                  resolve();
                }
              }).then((off) => { unlisten = off; });
            });
          };

          try {
            await waitForNoteReady(id, 2000);
          } catch (e) {
            await spawnNoteWindow({ id, rect: note.rect });
            await waitForNoteReady(id, 2000);
          }

          // Send hydration payload
          const current = get().notesById[id];
          if (current) {
            if (process.env.NODE_ENV !== 'production') {
              debug.log('STORE', '[Store] emitNoteHydrate after spawn', { id, rect: current.rect });
            }
            emitNoteHydrate({ id, title: current.title, content: current.content, color: current.color });
          }

          set((state) => {
            state.notesById[id].isOpen = true;
            state.notesById[id].isActive = true; // Mark as active when opened
            state.ui.focusedNoteId = id;
          });
          debug.log('WINDOW_LIFECYCLE', '[Store] Note window spawned and hydrated:', id);
        } catch (error) {
          debug.forceError('[Store] Failed to open note window:', id, error);
        } finally {
          inflightOpens.delete(openingKey);
        }
      },

      closeNoteWindowAction: async (id: ID) => {
        const note = get().notesById[id];
        if (!note || !note.isOpen) {
          debug.log('WINDOW_LIFECYCLE', '[Store] closeNoteWindowAction called for closed note:', id);
          return;
        }

        debug.log('WINDOW_LIFECYCLE', '[Store] closeNoteWindowAction called for:', id);
        try {
          await closeNoteWindow({ id });
          set((state) => {
            state.notesById[id].isOpen = false;
            state.notesById[id].isActive = false; // Mark as inactive when closed
            if (state.ui.focusedNoteId === id) {
              state.ui.focusedNoteId = null;
            }
          });
          debug.log('WINDOW_LIFECYCLE', '[Store] Note window closed:', id);
        } catch (error) {
          debug.forceError('[Store] Failed to close note window:', id, error);
        }
      },

      toggleNoteWindow: async (id: ID) => {
        const note = get().notesById[id];
        if (!note) return;

        if (note.isOpen) {
          await get().closeNoteWindowAction(id);
        } else {
          await get().openNoteWindow(id);
        }
      },

      updateNoteRect: (id: ID, rect: NoteRect) => {
        set((state) => {
          if (state.notesById[id]) {
            state.notesById[id].rect = rect;
          }
        });
        debouncedPersist(get());
      },

      updateNoteContent: (id: ID, updates: { title?: string; content?: string }) => {
        set((state) => {
          if (state.notesById[id]) {
            if (updates.title !== undefined) state.notesById[id].title = updates.title;
            if (updates.content !== undefined) state.notesById[id].content = updates.content;
          }
        });
        debouncedPersist(get());
      },

      updateNoteWindow: (id: ID, updates: Partial<NoteWindow>) => {
        set((state) => {
          if (state.notesById[id]) {
            Object.assign(state.notesById[id], updates);
          }
        });
        debouncedPersist(get());
      },

      updateNote: (id: ID, updates: Partial<NoteWindow>) => {
        set((state) => {
          if (state.notesById[id]) {
            Object.assign(state.notesById[id], updates);
          }
        });
        debouncedPersist(get());
      },

      deleteNote: async (id: ID) => {
        const note = get().notesById[id];
        if (!note) return;

        // Close OS window if open
        if (note.isOpen) {
          try {
            await closeNoteWindow({ id });
          } catch (error) {
            debug.warn('STORE', '[Store] Failed to close OS window during delete:', id, error);
          }
        }

        set((state) => {
          // Remove from normalized structure
          delete state.notesById[id];
          removeFromArray(state.noteIds, id);
          
          // Remove associated links
          for (const linkId of Object.keys(state.links)) {
            const link = state.links[linkId];
            if (link.sourceId === id || link.targetId === id) {
              delete state.links[linkId];
            }
          }
          
          // Clear from selection
          state.ui.selectedNoteIds = state.ui.selectedNoteIds.filter(noteId => noteId !== id);
          if (state.ui.focusedNoteId === id) {
            state.ui.focusedNoteId = null;
          }
        });

        debouncedPersist(get());
      },

      undoDelete: async () => {
        const last = get().ui.trash?.lastDeleted;
        if (!last) return;
        set((state) => {
          state.notesById[last.id] = last;
          state.noteIds.push(last.id);
          state.ui.trash.lastDeleted = undefined;
        });
        debouncedPersist(get());
      },

      markNoteClosedFromOS: (id: ID) => {
        set((state) => {
          if (state.notesById[id]) {
            state.notesById[id].isOpen = false;
            state.notesById[id].isActive = false;
            if (state.ui.focusedNoteId === id) {
              state.ui.focusedNoteId = null;
            }
          }
        });
      },

      setNoteOpen: (id: ID, isOpen: boolean) => {
        set((state) => {
          if (state.notesById[id]) {
            state.notesById[id].isOpen = isOpen;
            if (isOpen) {
              state.notesById[id].isActive = true;
              state.ui.focusedNoteId = id;
            } else {
              state.notesById[id].isActive = false;
              if (state.ui.focusedNoteId === id) {
                state.ui.focusedNoteId = null;
              }
            }
          }
        });
      },

      bringNoteToFront: (id: ID) => {
        set((state) => {
          if (state.notesById[id]) {
            const maxZ = Math.max(0, ...state.noteIds.map(noteId => state.notesById[noteId]?.z || 0));
            state.notesById[id].z = maxZ + 1;
            state.ui.focusedNoteId = id;
          }
        });
      },

      // Modal actions
      openEditModal: (id: ID) => {
        set((state) => {
          state.uiModalEditNote = { id };
        });
      },

      closeEditModal: () => {
        set((state) => {
          state.uiModalEditNote = null;
        });
      },

      // Delete confirmation actions
      openDeleteConfirmation: (noteId: ID, noteTitle: string, noteIsOpen: boolean) => {
        set((state) => {
          state.uiDeleteConfirmation = { noteId, noteTitle, noteIsOpen };
        });
      },

      closeDeleteConfirmation: () => {
        set((state) => {
          state.uiDeleteConfirmation = null;
        });
      },

      confirmDelete: async (noteId: ID) => {
        await get().deleteNote(noteId);
      },

      // Link actions (new)
      startConnect: (sourceNoteId: ID) => {
        set((state) => {
          state.linkingDraft.sourceNoteId = sourceNoteId;
          state.ui.mode = 'connect';
        });
      },

      completeConnect: (targetNoteId: ID) => {
        const sourceId = get().linkingDraft.sourceNoteId;
        if (!sourceId) return;

        const linkId = get().addDirectedLink(sourceId, targetNoteId);
        set((state) => {
          state.linkingDraft.sourceNoteId = null;
          state.ui.mode = 'select';
        });
        debug.log('LINKING', '[Store] Link created:', linkId, 'from', sourceId, 'to', targetNoteId);
      },

      cancelConnect: () => {
        set((state) => {
          state.linkingDraft.sourceNoteId = null;
          state.ui.mode = 'select';
        });
      },

      addDirectedLink: (parentId: ID, childId: ID): ID => {
        const linkId = nanoid();
        set((state) => {
          state.links[linkId] = {
            id: linkId,
            sourceId: parentId,
            targetId: childId,
            style: state.ui.connectStyle,
          };
        });
        debouncedPersist(get());
        return linkId;
      },

      removeLink: (linkId: ID) => {
        set((state) => {
          delete state.links[linkId];
        });
        debouncedPersist(get());
      },

      // Link actions (legacy)
      createLink: (sourceId: ID, targetId: ID) => {
        get().addDirectedLink(sourceId, targetId);
      },

      deleteLink: (id: ID) => {
        get().removeLink(id);
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
          const current = state.ui.selectedNoteIds;
          const index = current.indexOf(id);
          if (index >= 0) {
            current.splice(index, 1);
          } else {
            current.push(id);
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

      toggleWindowConnections: () => {
        set((state) => {
          state.ui.windows.showConnections = !state.ui.windows.showConnections;
        });
      },

      cycleWindowStyle: () => {
        set((state) => {
          const styles: WindowStyle[] = ['glass', 'solid', 'transparent'];
          const current = state.ui.windows.style;
          const currentIndex = styles.indexOf(current);
          const nextIndex = (currentIndex + 1) % styles.length;
          state.ui.windows.style = styles[nextIndex];
        });
      },

      setWindowStyle: (style: WindowStyle) => {
        set((state) => {
          state.ui.windows.style = style;
        });
      },

      setNoteActive: (id: ID, active: boolean) => {
        set((state) => {
          if (state.notesById[id]) {
            state.notesById[id].isActive = active;
          }
        });
      },

      setDragEchoBlock: (id: ID, ms: number) => {
        set((state) => {
          state.dragEchoBlock[id] = Date.now() + ms;
        });
      },

      // Board-side resize actions
      beginResizeDraft: (id: ID, rect: NoteRect) => {
        set((state) => {
          state.ui.resizeDrafts[id] = rect;
        });
      },

      updateResizeDraft: (id: ID, rect: NoteRect) => {
        set((state) => {
          state.ui.resizeDrafts[id] = rect;
        });
      },

      commitResizeDraft: (id: ID): NoteRect | undefined => {
        const draft = get().ui.resizeDrafts[id];
        if (!draft) return undefined;

        set((state) => {
          if (state.notesById[id]) {
            state.notesById[id].rect = draft;
          }
          delete state.ui.resizeDrafts[id];
        });
        debouncedPersist(get());
        return draft;
      },

      cancelResizeDraft: (id: ID) => {
        set((state) => {
          delete state.ui.resizeDrafts[id];
        });
      },

      setNoteRect: (id: ID, rect: NoteRect) => {
        set((state) => {
          if (state.notesById[id]) {
            state.notesById[id].rect = rect;
          }
        });
        debouncedPersist(get());
      },

      initializeFromState: (state: BoardState) => {
        const normalized = migrateToNormalized(state);
        set((draft) => {
          Object.assign(draft, normalized);
        });
        debouncedPersist(get());
      },

      resetToSampleLayout: () => {
        const sampleNotes: NoteWindow[] = [
          {
            id: 'sample-1',
            title: 'Welcome to HierarchyNotes',
            content: 'This is your first note. You can edit it by double-clicking or using the context menu.',
            rect: { x: 100, y: 100, width: 300, height: 200 },
            z: 1,
            isOpen: false,
            isActive: true,
          },
          {
            id: 'sample-2',
            title: 'Getting Started',
            content: 'Try creating new notes, connecting them with links, and organizing your thoughts.',
            rect: { x: 450, y: 150, width: 280, height: 180 },
            z: 2,
            isOpen: false,
            isActive: true,
          },
          {
            id: 'sample-3',
            title: 'Tips & Tricks',
            content: 'Use the toolbar to switch between modes: select, connect, and resize.',
            rect: { x: 200, y: 350, width: 320, height: 160 },
            z: 3,
            isOpen: false,
            isActive: true,
          },
        ];

        set((state) => {
          state.notesById = {};
          state.noteIds = [];
          state.links = {};
          
          sampleNotes.forEach(note => {
            state.notesById[note.id] = note;
            state.noteIds.push(note.id);
          });
        });

        debouncedPersist(get());
      },

      // Selectors
      selectAllNotes: () => {
        return get().noteIds.map(id => get().notesById[id]).filter(Boolean);
      },

      selectNoteById: (id: ID) => {
        return get().notesById[id];
      },

      persistNow: async () => {
        await debouncedPersist(get());
      },

      toggleNoteHidden: (id: ID) => {
        set((state) => {
          if (state.notesById[id]) {
            state.notesById[id].isActive = !state.notesById[id].isActive;
          }
        });
      },

      // Ordering
      setNoteOrder: (ids: ID[]) => {
        set((state) => {
          // Only keep ids that exist
          state.noteIds = ids.filter(id => !!state.notesById[id]);
        });
      },
    }))
  )
);

// ---------- Stable Selectors ----------
export const selectNoteById = (id: string) => (s: BoardStoreState) => s.notesById[id];
export const selectAllNotesArray = (s: BoardStoreState) => s.noteIds.map(id => s.notesById[id]).filter(Boolean);
export const selectOpenNotes = (s: BoardStoreState) => s.noteIds.map(id => s.notesById[id]).filter(Boolean).filter(n => n.isOpen);
export const selectNoteIds = (s: BoardStoreState) => s.noteIds;
export const selectLinks = (s: BoardStoreState) => s.links;

// Hooks for components
export const useNotesArray = () => useBoardStore(selectAllNotesArray);
export const useNote = (id: string) => useBoardStore(selectNoteById(id));
export const useNoteIds = () => useBoardStore(selectNoteIds);
