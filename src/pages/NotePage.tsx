// NotePage - individual note window view

import { useEffect, useState, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { emit as tauriEmit } from '@tauri-apps/api/event';
import {
  onNoteHydrate,
  emitNoteMoved,
  emitNoteResized,
  emitNoteFocused,
  emitNoteBlurred,
  emitNoteClosed,
  emitNoteRequestHydrate,
  emitNoteReady,
} from '../app/ipc';
import NoteShell from '../components/Note/NoteShell';
import type { NoteHydrateEvent, NoteRect } from '../lib/types';

export default function NotePage() {
  const [noteData, setNoteData] = useState<NoteHydrateEvent | null>(null);
  const windowRef = useRef<ReturnType<typeof getCurrentWindow> | null>(null);
  const positionCheckInterval = useRef<number | null>(null);
  const adaptiveTimer = useRef<number | null>(null);
  const hydrationRetryTimeout = useRef<number | null>(null);

  useEffect(() => {
    windowRef.current = getCurrentWindow();
    
    // Derive both label and raw ids
    const labelId = windowRef.current.label; // e.g., 'note-4' (matches store keys)
    const rawId = labelId.startsWith('note-') ? labelId.replace(/^note-/, '') : labelId;
    const storeId = labelId; // use label as store id for all IPC
    console.log('[NotePage] Mounted', { labelId, rawId, storeId });

    // Listen for hydration event FIRST, then signal readiness
    let unlisten: (() => void) | null = null;
    const setupHydration = async () => {
      unlisten = await onNoteHydrate((event) => {
        console.log('[NotePage] note:hydrate received', event, 'expect id=', storeId);
        if (event.id === storeId) {
          console.log('[NotePage] Hydrating', storeId);
          setNoteData(event);
        }
      });
      // Immediately declare readiness to Board, then keep request_hydrate for backward-compat
      if (process.env.NODE_ENV !== 'production') {
        console.log('[NotePage] note:ready =>', storeId);
      }
      emitNoteReady({ id: storeId });
      // Fallback (older Board): request hydrate
      emitNoteRequestHydrate({ id: storeId });
      // Retry once after 1s if still not hydrated
      hydrationRetryTimeout.current = window.setTimeout(() => {
        if (!noteData) {
          console.log('[NotePage] note:request_hydrate RETRY =>', storeId);
          emitNoteRequestHydrate({ id: storeId });
        }
      }, 1000);
    };

    setupHydration();

    // Adaptive polling setup
    const ACTIVE_MS = 1500;
    const IDLE_INTERVAL = 450;
    const ACTIVE_INTERVAL = 100;
    let lastActiveAt = Date.now();
    let lastRect: NoteRect | null = null;

    const markActive = () => {
      lastActiveAt = Date.now();
    };

    const currentInterval = () =>
      Date.now() - lastActiveAt < ACTIVE_MS ? ACTIVE_INTERVAL : IDLE_INTERVAL;

    const sampleAndEmit = async () => {
      if (!windowRef.current) return false;
      try {
        const position = await windowRef.current.outerPosition();
        const size = await windowRef.current.outerSize();
        const dpr = window.devicePixelRatio || 1;
        const currentRect: NoteRect = {
          x: Math.round(position.x / dpr),
          y: Math.round(position.y / dpr),
          width: Math.round(size.width / dpr),
          height: Math.round(size.height / dpr),
        };
        let changed = false;
        if (!lastRect || lastRect.x !== currentRect.x || lastRect.y !== currentRect.y) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[NotePage] emit note:moved', { id: storeId, rect: currentRect, dpr, raw: { position, size } });
          }
          tauriEmit('note:moved', { id: storeId, rect: currentRect });
          changed = true;
        }
        if (!lastRect || lastRect.width !== currentRect.width || lastRect.height !== currentRect.height) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[NotePage] emit note:resized', { id: storeId, rect: currentRect, dpr, raw: { position, size } });
          }
          tauriEmit('note:resized', { id: storeId, rect: currentRect });
          changed = true;
        }
        if (changed && process.env.NODE_ENV !== 'production') {
          console.log('[NotePage] rect changed', { prev: lastRect, next: currentRect });
        }
        lastRect = currentRect;
        return changed;
      } catch (error) {
        console.error('[NotePage] Error checking window position:', error);
        return false;
      }
    };

    const tick = async () => {
      const changed = await sampleAndEmit();
      if (changed) markActive();
      adaptiveTimer.current = window.setTimeout(tick, currentInterval());
    };
    tick();

    // Focus/blur events
    const handleFocus = () => {
      emitNoteFocused({ id: storeId });
      // Treat focus as activity for polling
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (function () { /* micro-task */ })();
    };

    const handleBlur = () => {
      emitNoteBlurred({ id: storeId });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Do not emit note:closed on beforeunload; rely on Rust Destroyed event to avoid false closes during HMR

    return () => {
      if (unlisten) unlisten();
      if (hydrationRetryTimeout.current) {
        clearTimeout(hydrationRetryTimeout.current);
      }
      if (adaptiveTimer.current) window.clearTimeout(adaptiveTimer.current);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      // no beforeunload handler
    };
  }, []);

  return (
    <div className="w-full h-full">
      <NoteShell noteData={noteData} />
    </div>
  );
}

