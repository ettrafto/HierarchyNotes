// BoardPage - main board view with grid and link layer

import { useEffect, useRef, useState } from 'react';
import { useBoardStore } from '../app/store';
import { loadBoardState, saveBoardState, createSampleData } from '../app/persistence';
import {
  onNoteMoved,
  onNoteResized,
  onNoteFocused,
  onNoteClosed,
  onNoteContentChanged,
  emitNoteHydrate,
  onNoteRequestHydrate,
  onNoteReady,
} from '../app/ipc';
import Grid from '../components/Board/Grid';
import LinkLayer from '../components/Board/LinkLayer';
import Topbar from '../components/Board/Topbar';
import Toolbar from '../components/Board/Toolbar';
import Inspector from '../components/Board/Inspector';
import AutoSaveToast from '../components/Toasts/AutoSaveToast';
import type { NoteWindow } from '../lib/types';

export default function BoardPage() {
  const initializeFromState = useBoardStore((state) => state.initializeFromState);
  const updateNoteRect = useBoardStore((state) => state.updateNoteRect);
  const updateNoteContent = useBoardStore((state) => state.updateNoteContent);
  const setNoteOpen = useBoardStore((state) => state.setNoteOpen);
  const bringNoteToFront = useBoardStore((state) => state.bringNoteToFront);
  const openNoteWindow = useBoardStore((state) => state.openNoteWindow);
  const notes = useBoardStore((state) => state.notes);
  const allNotesArray = Object.values(notes);

  // Autosave toast state
  const [persistStatus, setPersistStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Helper: wait for note:ready(id)
  function waitForNoteReady(id: string, ms: number): Promise<void> {
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
      }).then((off) => {
        unlisten = off;
      });
    });
  }

  // Initialize board state on mount (only once)
  useEffect(() => {
    const initializeBoard = async () => {
      
      console.log('[BoardPage] Initializing board...');
      const savedState = await loadBoardState();
      console.log('[BoardPage] Loaded state:', savedState);

      const store = useBoardStore.getState();

      if (savedState && Object.keys(savedState.notes).length > 0) {
        console.log('[BoardPage] Loading saved state with', Object.keys(savedState.notes).length, 'notes');
        
        // Reset isOpen flag for all notes (windows aren't actually open on startup)
        Object.values(savedState.notes).forEach(note => {
          note.isOpen = false;
        });
        
        store.initializeFromState(savedState);

        // Open all notes to ensure visibility on launch
        for (const note of Object.values(savedState.notes)) {
          console.log('[BoardPage] Opening note window:', note.id);
          await store.openNoteWindow(note.id);
          try {
            await waitForNoteReady(note.id, 2000);
          } catch (e) {
            // retry once
            await store.openNoteWindow(note.id);
            await waitForNoteReady(note.id, 2000);
          }
          const n = useBoardStore.getState().notes[note.id];
          if (n) {
            emitNoteHydrate({ id: note.id, title: n.title, content: n.content, color: n.color });
          }
        }
      } else {
        // First run - create sample data
        console.log('[BoardPage] No saved state, creating sample data');
        const sampleData = createSampleData();
        console.log('[BoardPage] Sample data created with', Object.keys(sampleData.notes).length, 'notes');
        store.initializeFromState(sampleData);
        await saveBoardState(sampleData);

        // Open all sample notes
        for (const note of Object.values(sampleData.notes)) {
          console.log('[BoardPage] Opening note window:', note.id);
          await store.openNoteWindow(note.id);
          try {
            await waitForNoteReady(note.id, 2000);
          } catch (e) {
            await store.openNoteWindow(note.id);
            await waitForNoteReady(note.id, 2000);
          }
          const n = useBoardStore.getState().notes[note.id];
          if (n) {
            emitNoteHydrate({ id: note.id, title: n.title, content: n.content, color: n.color });
          }
        }
      }
      console.log('[BoardPage] Initialization complete');
    };

    initializeBoard().catch(err => {
      console.error('[BoardPage] Initialization error:', err);
    });
  }, []); // Empty deps - only run once on mount

  // Set up IPC listeners
  useEffect(() => {
    const listeners: Array<() => void> = [];

    const setupListeners = async () => {
      listeners.push(await onNoteMoved((event) => {
        updateNoteRect(event.id, event.rect);
      }));

      listeners.push(await onNoteResized((event) => {
        updateNoteRect(event.id, event.rect);
      }));

      listeners.push(await onNoteFocused((event) => {
        bringNoteToFront(event.id);
      }));

      listeners.push(await onNoteClosed((event) => {
        setNoteOpen(event.id, false);
      }));

      listeners.push(await onNoteContentChanged((event) => {
        updateNoteContent(event.id, {
          title: event.title,
          content: event.content,
        });
      }));

      // Respond to hydration request from a note window
      listeners.push(
        await onNoteRequestHydrate(({ id }) => {
          const state = useBoardStore.getState();
          const n = state.notes[id] || state.notes[id.replace(/^note-/, '')];
          if (!n) return;
          emitNoteHydrate({ id, title: n.title, content: n.content, color: n.color });
        })
      );
    };

    setupListeners();

    return () => {
      listeners.forEach((unlisten) => unlisten());
    };
  }, [updateNoteRect, updateNoteContent, setNoteOpen, bringNoteToFront]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // N or Cmd/Ctrl+N for new note
      if ((e.key === 'n' || e.key === 'N') && (e.metaKey || e.ctrlKey || !e.metaKey && !e.ctrlKey)) {
        if (!e.metaKey && !e.ctrlKey && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
          useBoardStore.getState().createNote();
        } else if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          useBoardStore.getState().createNote();
        }
      }

      // G for toggle snap to grid
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        useBoardStore.getState().toggleSnapToGrid();
      }

      // Delete/Backspace for delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.metaKey && !e.ctrlKey && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        const state = useBoardStore.getState();
        state.ui.selectedNoteIds.forEach((id) => state.deleteNote(id));
        state.ui.selectedLinkIds.forEach((id) => state.deleteLink(id));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResetLayout = async () => {
    const sampleData = createSampleData();
    
    // Close all existing windows
    for (const note of Object.values(notes)) {
      if (note.isOpen) {
        setNoteOpen(note.id, false);
      }
    }

    initializeFromState(sampleData);
    await saveBoardState(sampleData);

    // Open all sample notes
    for (const note of Object.values(sampleData.notes)) {
      await openNoteWindow(note.id);
      try {
        await waitForNoteReady(note.id, 2000);
      } catch (e) {
        await openNoteWindow(note.id);
        await waitForNoteReady(note.id, 2000);
      }
      emitNoteHydrate({ id: note.id, title: note.title, content: note.content, color: note.color });
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <Topbar onResetLayout={handleResetLayout} />
      <Toolbar />
      
      <div className="relative flex-1 overflow-hidden">
        <AutoSaveToast status={persistStatus} message={toastMessage} onHide={() => setPersistStatus('idle')} />
        <Grid />
        <LinkLayer />
        <Inspector />

        {/* Empty state */}
        {allNotesArray.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center opacity-70">
              <div className="text-lg font-semibold">No notes yet</div>
              <div className="text-sm text-muted-foreground">Click "New Note" or use the Reset button to seed a sample layout.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

