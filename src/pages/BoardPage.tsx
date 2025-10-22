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
import NoteGhosts from '../components/Board/NoteGhosts';
import Topbar from '../components/Board/Topbar';
import Toolbar from '../components/Board/Toolbar';
import Inspector from '../components/Board/Inspector';
import AutoSaveToast from '../components/Toasts/AutoSaveToast';
import type { NoteWindow } from '../lib/types';
import NotesList from '../components/Board/NotesList';
import { currentMonitor } from '@tauri-apps/api/window';
import ExternalTiles from '../components/Board/ExternalTiles';
import { listTopLevelWindows } from '../app/ipc';

export default function BoardPage() {
  const initializeFromState = useBoardStore((state) => state.initializeFromState);
  const updateNoteRect = useBoardStore((state) => state.updateNoteRect);
  const updateNoteContent = useBoardStore((state) => state.updateNoteContent);
  const setNoteOpen = useBoardStore((state) => state.setNoteOpen);
  const bringNoteToFront = useBoardStore((state) => state.bringNoteToFront);
  const openNoteWindow = useBoardStore((state) => state.openNoteWindow);
  const notes = useBoardStore((state) => state.notes);
  const sidebarCollapsed = useBoardStore((state) => state.ui.sidebarCollapsed);
  const snapToGrid = useBoardStore((state) => state.ui.snapToGrid);
  const allNotesArray = Object.values(notes);
  const externals = useBoardStore((s) => s.externals || {});
  const syncExternalFromOS = useBoardStore((s) => s.syncExternalFromOS);

  // Autosave toast state
  const [persistStatus, setPersistStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Screen scaling (proportional board)
  const [scale, setScale] = useState<{ factor: number; width: number; height: number }>({ factor: 1, width: 0, height: 0 });
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [gridPx, setGridPx] = useState(20);
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
          console.log('[BoardPage] useScreenScale', { screenWidth, screenHeight, boardWidth, boardHeight, factor });
        }
      } catch (e) {
        console.warn('[BoardPage] currentMonitor failed', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!boardRef.current) return;
    const cs = getComputedStyle(boardRef.current);
    const varGrid = cs.getPropertyValue('--board-grid-size').trim();
    if (varGrid && varGrid.endsWith('px')) {
      setGridPx(parseFloat(varGrid));
    } else {
      const bgSize = (cs as any).backgroundSize || '';
      const match = String(bgSize).match(/([\d.]+)px/);
      setGridPx(match ? parseFloat(match[1]) : 20);
    }
  }, [boardRef.current]);

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
        // Do not auto-open on boot in this pass
      } else {
        // First run - create sample data
        console.log('[BoardPage] No saved state, creating sample data');
        const sampleData = createSampleData();
        console.log('[BoardPage] Sample data created with', Object.keys(sampleData.notes).length, 'notes');
        store.initializeFromState(sampleData);
        await saveBoardState(sampleData);
        // Do not auto-open on first run in this pass
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
        if (process.env.NODE_ENV !== 'production') {
          const dpr = window.devicePixelRatio || 1;
          console.log('[BoardPage] onNoteMoved', event, 'store keys=', Object.keys(useBoardStore.getState().notes), 'dpr=', dpr);
        }
        // Use label id directly; store uses 'note-<id>' keys
        updateNoteRect(event.id, event.rect);
      }));

      listeners.push(await onNoteResized((event) => {
        if (process.env.NODE_ENV !== 'production') {
          const dpr = window.devicePixelRatio || 1;
          console.log('[BoardPage] onNoteResized', event, 'store keys=', Object.keys(useBoardStore.getState().notes), 'dpr=', dpr);
        }
        updateNoteRect(event.id, event.rect);
      }));

      listeners.push(await onNoteFocused((event) => {
        bringNoteToFront(event.id);
      }));

      listeners.push(await onNoteClosed((event) => {
        useBoardStore.getState().markNoteClosedFromOS(event.id);
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

  // Lightweight polling to keep external sizes in sync while focused
  useEffect(() => {
    const interval = window.setInterval(() => {
      const ids = Object.keys(useBoardStore.getState().externals || {});
      ids.forEach((id) => syncExternalFromOS(id));
    }, 3000);
    return () => window.clearInterval(interval);
  }, [syncExternalFromOS]);

  // Auto-discovery of external windows (Chrome/Spotify) and upsert tiles
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function tick() {
      try {
        const all = await listTopLevelWindows();
        if (process.env.NODE_ENV !== 'production') {
          console.log('[BoardPage] listTopLevelWindows count=', all.length, all.slice(0, 5));
        }
        // Keep only windows that are not ours and are within the primary monitor logical bounds
        const maxW = scale.width || window.innerWidth;
        const maxH = scale.height || window.innerHeight;
        const filtered = all.filter((w) => {
          const isSelf = /HierarchyNotes/i.test(w.title);
          // listTopLevelWindows already returns logical px (we convert in ipc if needed),
          // so treat these as logical directly to avoid double-dividing by DPR.
          const lx = (w.x || 0);
          const ly = (w.y || 0);
          const lw = (w.width || 0);
          const lh = (w.height || 0);
          const withinX = lx + lw > 0 && lx < (scale.width || maxW);
          const withinY = ly + lh > 0 && ly < (scale.height || maxH);
          return !isSelf && withinX && withinY;
        });
        if (process.env.NODE_ENV !== 'production') {
          console.log('[BoardPage] externals filtered=', filtered.length);
        }
        const store = useBoardStore.getState();
        filtered.forEach((w) => store.upsertExternalFromOS(w as any));
        store.reconcileExternalsFromScan(filtered.map((w) => w.hwnd));
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.warn('[BoardPage] listTopLevelWindows failed', e);
      } finally {
        if (!cancelled) timer = window.setTimeout(tick, 1500);
      }
    }

    tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
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
            ref={boardRef}
            style={{
              width: scale.width * scale.factor,
              height: scale.height * scale.factor,
              transformOrigin: 'top left',
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <Grid />
            <NoteGhosts scale={scale.factor} gridPx={gridPx} enableSnap={snapToGrid} />
            <ExternalTiles scale={scale.factor} />
            <LinkLayer />
            <Inspector />
            {/* Empty state */}
            {allNotesArray.length === 0 && Object.keys(externals).length === 0 && (
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

