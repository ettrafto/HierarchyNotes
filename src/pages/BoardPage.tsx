// BoardPage - main board view with grid and link layer

import { useEffect, useRef, useState } from 'react';
import { useBoardStore, resizingViaBoard } from '../app/store';
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
import WindowLinkLayer from '../components/Board/WindowLinkLayer';
import NoteGhosts from '../components/Board/NoteGhosts';
import NoteFrame from '../components/Board/NoteFrame';
import Topbar from '../components/Board/Topbar';
import Toolbar from '../components/Board/Toolbar';
import AutoSaveToast from '../components/Toasts/AutoSaveToast';
import type { NoteWindow } from '../lib/types';
import NotesList from '../components/Board/NotesList';
import { currentMonitor } from '@tauri-apps/api/window';
import { spawnOverlay } from '../app/overlay';
import { emitOverlayStateSync } from '../app/ipc';
import { debug } from '../lib/debug';

export default function BoardPage() {
  const initializeFromState = useBoardStore((state) => state.initializeFromState);
  const updateNoteRect = useBoardStore((state) => state.updateNoteRect);
  const updateNoteContent = useBoardStore((state) => state.updateNoteContent);
  const setNoteOpen = useBoardStore((state) => state.setNoteOpen);
  const bringNoteToFront = useBoardStore((state) => state.bringNoteToFront);
  const openNoteWindow = useBoardStore((state) => state.openNoteWindow);
  const notes = useBoardStore((state) => state.notes);
  const links = useBoardStore((state) => state.links);
  const showConnections = useBoardStore((state) => state.ui.windows.showConnections);
  const connectStyle = useBoardStore((state) => state.ui.connectStyle);
  const sidebarCollapsed = useBoardStore((state) => state.ui.sidebarCollapsed);
  const allNotesArray = Object.values(notes);

  // Autosave toast state
  const [persistStatus, setPersistStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Screen scaling (proportional board)
  const [scale, setScale] = useState<{ factor: number; width: number; height: number }>({ factor: 1, width: 0, height: 0 });
  useEffect(() => {
    (async () => {
      try {
        const monitor = await currentMonitor();
        if (!monitor) return;
        const { width, height } = monitor.size;
        const dpr = window.devicePixelRatio || 1;
        const screenWidth = width / dpr;
        const screenHeight = height / dpr;
        const boardWidth = window.innerWidth;
        const boardHeight = window.innerHeight;
        const scaleX = boardWidth / screenWidth;
        const scaleY = boardHeight / screenHeight;
        const factor = Math.min(scaleX, scaleY);
        setScale({ factor, width: screenWidth, height: screenHeight });
        if (process.env.NODE_ENV !== 'production') {
          debug.log('BOARD_PAGE', '[BoardPage] useScreenScale', { screenWidth, screenHeight, boardWidth, boardHeight, factor });
        }
      } catch (e) {
        debug.warn('BOARD_PAGE', '[BoardPage] currentMonitor failed', e);
      }
    })();
  }, []);

  // Spawn overlay window for desktop connections
  useEffect(() => {
    debug.log('OVERLAY', '[BoardPage] Spawning overlay window...');
    spawnOverlay().catch(err => {
      debug.forceError('[BoardPage] Failed to spawn overlay:', err);
    });
  }, []);

  // Sync state to overlay whenever relevant state changes
  useEffect(() => {
    debug.log('OVERLAY', '[BoardPage] Syncing state to overlay...');
    emitOverlayStateSync({
      notes,
      links,
      showConnections,
      connectStyle,
    }).catch(err => {
      debug.forceError('[BoardPage] Failed to sync to overlay:', err);
    });
  }, [notes, links, showConnections, connectStyle]);

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
      
      debug.log('BOARD_PAGE', '[BoardPage] Initializing board...');
      const savedState = await loadBoardState();
      debug.log('BOARD_PAGE', '[BoardPage] Loaded state:', savedState);

      const store = useBoardStore.getState();

      if (savedState && Object.keys(savedState.notes).length > 0) {
        debug.log('BOARD_PAGE', '[BoardPage] Loading saved state with', Object.keys(savedState.notes).length, 'notes');
        
        // Reset isOpen flag for all notes (windows aren't actually open on startup)
        Object.values(savedState.notes).forEach(note => {
          note.isOpen = false;
        });
        
        store.initializeFromState(savedState);
        // Do not auto-open on boot in this pass
      } else {
        // First run - create sample data
        debug.log('BOARD_PAGE', '[BoardPage] No saved state, creating sample data');
        const sampleData = createSampleData();
        debug.log('BOARD_PAGE', '[BoardPage] Sample data created with', Object.keys(sampleData.notes).length, 'notes');
        store.initializeFromState(sampleData);
        await saveBoardState(sampleData);
        // Do not auto-open on first run in this pass
      }
      debug.log('BOARD_PAGE', '[BoardPage] Initialization complete');
    };

    initializeBoard().catch(err => {
      debug.forceError('[BoardPage] Initialization error:', err);
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
        // Event loop protection: ignore one event if this was triggered by Board-side resize
        const rawId = event.id.replace(/^note-/, '');
        if (resizingViaBoard.has(rawId)) {
          // Treat as ACK of our programmatic resize, don't double-commit
          resizingViaBoard.delete(rawId);
          return;
        }
        updateNoteRect(event.id, event.rect);
      }));

      listeners.push(await onNoteFocused((event) => {
        bringNoteToFront(event.id);
      }));

      listeners.push(await onNoteClosed((event) => {
        debug.log('WINDOW_LIFECYCLE', '[BoardPage] ⚠️ note:closed event received:', event);
        const state = useBoardStore.getState();
        debug.log('WINDOW_LIFECYCLE', '[BoardPage] Current note state BEFORE markNoteClosedFromOS:', {
          id: event.id,
          note: state.notes[event.id],
        });
        state.markNoteClosedFromOS(event.id);
        debug.log('WINDOW_LIFECYCLE', '[BoardPage] Current note state AFTER markNoteClosedFromOS:', {
          id: event.id,
          note: state.notes[event.id],
        });
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
      // Escape to cancel connect or resize mode
      if (e.key === 'Escape') {
        const state = useBoardStore.getState();
        if (state.ui.mode === 'connect') {
          e.preventDefault();
          state.cancelConnect();
        } else if (state.ui.mode === 'resize') {
          e.preventDefault();
          state.setMode('select');
        }
        return;
      }

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
  };

  return (
    <div className="w-full h-full flex flex-col">
      <Topbar onResetLayout={handleResetLayout} />
      <Toolbar />
      
      <div className="flex flex-1 overflow-hidden">
        {!sidebarCollapsed && (
          <aside className="relative z-20">
            <NotesList />
          </aside>
        )}
        <main className="relative flex-1 overflow-hidden flex items-center justify-center bg-neutral-900">
          <AutoSaveToast status={persistStatus} message={toastMessage} onHide={() => setPersistStatus('idle')} />
          <div
            className="relative"
            style={{
              width: scale.width * scale.factor,
              height: scale.height * scale.factor,
              transformOrigin: 'top left',
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <Grid />
            <WindowLinkLayer scale={scale.factor} />
            <NoteGhosts scale={scale.factor} />
            <LinkLayer scale={scale.factor} />
            {/* Frames with resize handles */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
              {allNotesArray.map((n) => (
                <NoteFrame key={n.id} id={n.id} scale={scale.factor} />
              ))}
            </div>
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
        </main>
      </div>
    </div>
  );
}

