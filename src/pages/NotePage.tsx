// NotePage - individual note window view

import { useEffect, useState, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  onNoteHydrate,
  emitNoteMoved,
  emitNoteResized,
  emitNoteFocused,
  emitNoteBlurred,
  emitNoteClosed,
  emitNoteRequestHydrate,
} from '../app/ipc';
import NoteShell from '../components/Note/NoteShell';
import type { NoteHydrateEvent, NoteRect } from '../lib/types';

export default function NotePage() {
  const [noteData, setNoteData] = useState<NoteHydrateEvent | null>(null);
  const windowRef = useRef<ReturnType<typeof getCurrentWindow> | null>(null);
  const positionCheckInterval = useRef<number | null>(null);
  const hydrationRetryTimeout = useRef<number | null>(null);

  useEffect(() => {
    windowRef.current = getCurrentWindow();
    
    // Derive both label and raw ids
    const labelId = windowRef.current.label; // e.g., 'note-4' (matches store keys)
    const rawId = labelId.startsWith('note-') ? labelId.replace(/^note-/, '') : labelId;
    const storeId = labelId; // use label as store id for all IPC
    console.log('[NotePage] Mounted', { labelId, rawId, storeId });

    // Listen for hydration event
    let unlisten: (() => void) | null = null;
    const setupHydration = async () => {
      unlisten = await onNoteHydrate((event) => {
        console.log('[NotePage] note:hydrate received', event, 'expect id=', storeId);
        if (event.id === storeId) {
          console.log('[NotePage] Hydrating', storeId);
          setNoteData(event);
        }
      });
      // Ask Board to send hydration for this note (after listener is attached)
      console.log('[NotePage] note:request_hydrate =>', storeId);
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

    // Set up window event listeners
    let lastRect: NoteRect | null = null;

    const checkPosition = async () => {
      if (!windowRef.current) return;

      try {
        const position = await windowRef.current.outerPosition();
        const size = await windowRef.current.outerSize();

        const currentRect: NoteRect = {
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
        };

        // Check if position or size changed
        if (
          !lastRect ||
          lastRect.x !== currentRect.x ||
          lastRect.y !== currentRect.y
        ) {
          emitNoteMoved({ id: storeId, rect: currentRect });
        }

        if (
          !lastRect ||
          lastRect.width !== currentRect.width ||
          lastRect.height !== currentRect.height
        ) {
          emitNoteResized({ id: storeId, rect: currentRect });
        }

        lastRect = currentRect;
      } catch (error) {
        console.error('Error checking window position:', error);
      }
    };

    // Poll for position/size changes (Tauri v2 doesn't have reliable move/resize events)
    positionCheckInterval.current = window.setInterval(checkPosition, 100);

    // Focus/blur events
    const handleFocus = () => {
      emitNoteFocused({ id: storeId });
    };

    const handleBlur = () => {
      emitNoteBlurred({ id: storeId });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Handle window close
    const handleBeforeUnload = () => {
      emitNoteClosed({ id: storeId });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (unlisten) unlisten();
      if (hydrationRetryTimeout.current) {
        clearTimeout(hydrationRetryTimeout.current);
      }
      if (positionCheckInterval.current) {
        clearInterval(positionCheckInterval.current);
      }
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div className="w-full h-full">
      <NoteShell noteData={noteData} />
    </div>
  );
}

