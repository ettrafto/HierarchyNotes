import { useEffect, useMemo, useRef, useState } from 'react';
import { useBoardStore } from '../../app/store';
import { setNotePosition, setNoteRect } from '../../app/ipc';
import { snapRectPosition, snapRectSize } from '../../lib/utils';

export default function NoteGhosts({ scale, gridPx, enableSnap }: { scale: number; gridPx?: number; enableSnap?: boolean }) {
  const notesRecord = useBoardStore((s) => s.notes);
  const notes = useMemo(() => Object.values(notesRecord), [notesRecord]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[NoteGhosts] render notes', notes.map(n => ({ id: n.id, rect: n.rect, isOpen: n.isOpen })));
    }
  }, [notes]);

  return (
    <div className="absolute inset-0" style={{ zIndex: 2 }}>
      {notes.map((n) => (
        <Ghost key={n.id} noteId={n.id} title={n.title} rect={n.rect} isOpen={!!n.isOpen} scale={scale} gridPx={gridPx} enableSnap={enableSnap} />
      ))}
    </div>
  );
}

function Ghost({ noteId, title, rect, isOpen, scale, gridPx, enableSnap }: { noteId: string; title: string; rect: { x: number; y: number; width: number; height: number }; isOpen: boolean; scale: number; gridPx?: number; enableSnap?: boolean }) {
  const startClient = useRef<{ x: number; y: number } | null>(null);
  const startRect = useRef<{ x: number; y: number } | null>(null);
  const lastClient = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const didDrag = useRef(false);
  const [altDown, setAltDown] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => setAltDown(e.altKey);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  // Grid size from CSS var or fallback
  const gridRef = useRef<number>(gridPx || 20);
  useEffect(() => {
    if (gridPx && process.env.NODE_ENV !== 'production') {
      console.log('[Ghost] gridPx from Board', gridPx);
    }
    if (gridPx) gridRef.current = gridPx;
  }, [gridPx]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    startClient.current = { x: e.clientX, y: e.clientY };
    startRect.current = { x: rect.x, y: rect.y };
    dragging.current = true;
    setIsDragging(true);
    lastClient.current = { x: e.clientX, y: e.clientY };
    didDrag.current = false;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Ghost] drag start', noteId, { startRect: startRect.current, client: startClient.current, scale });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !startClient.current || !startRect.current) return;
    e.preventDefault();
    const dxCss = (e.clientX - startClient.current.x) / scale;
    const dyCss = (e.clientY - startClient.current.y) / scale;
    let nextX = Math.round(startRect.current.x + dxCss);
    let nextY = Math.round(startRect.current.y + dyCss);

    if (enableSnap && !altDown) {
      const s = snapRectPosition(nextX, nextY, gridRef.current);
      nextX = s.x; nextY = s.y;
    }

    useBoardStore.getState().updateNoteRect(noteId, { ...rect, x: nextX, y: nextY }, { fromDrag: true });
    lastClient.current = { x: e.clientX, y: e.clientY };
    if (!didDrag.current) {
      const moved = Math.abs(dxCss) > 2 || Math.abs(dyCss) > 2;
      if (moved) didDrag.current = true;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Ghost] drag move', noteId, { nextX, nextY, altDown });
    }
  };

  const finalizeDrag = async (clientX: number, clientY: number) => {
    if (!dragging.current || !startClient.current || !startRect.current) return;
    const dxCss = (clientX - startClient.current.x) / scale;
    const dyCss = (clientY - startClient.current.y) / scale;
    let nextX = Math.round(startRect.current.x + dxCss);
    let nextY = Math.round(startRect.current.y + dyCss);
    if (enableSnap && !altDown) {
      const s = snapRectPosition(nextX, nextY, gridRef.current);
      nextX = s.x; nextY = s.y;
    }

    dragging.current = false;
    startClient.current = null;
    startRect.current = null;
    lastClient.current = null;
    setIsDragging(false);

    useBoardStore.getState().updateNoteRect(noteId, { ...rect, x: nextX, y: nextY }, { fromDrag: true });
    useBoardStore.getState().setDragEchoBlock(noteId, 300);

    if (isOpen) {
      try {
        await setNotePosition(noteId, nextX, nextY);
      } catch (err) {
        console.warn('[Ghost] setNotePosition failed', noteId, err);
      }
    }
  };

  const onPointerUp = async (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (!lastClient.current) return;
    await finalizeDrag(lastClient.current.x, lastClient.current.y);
  };

  const onPointerCancel = async () => {
    dragging.current = false;
    startClient.current = null;
    startRect.current = null;
    lastClient.current = null;
    setIsDragging(false);
  };

  const onPointerLeave = async () => {
    if (dragging.current) {
      if (lastClient.current) {
        await finalizeDrag(lastClient.current.x, lastClient.current.y);
      } else {
        dragging.current = false;
        startClient.current = null;
        startRect.current = null;
        lastClient.current = null;
        setIsDragging(false);
      }
    }
  };

  const onClick = async () => {
    if (isDragging || didDrag.current) {
      didDrag.current = false;
      return;
    }
    const store = useBoardStore.getState();
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Ghost] toggle window', noteId, { wasOpen: isOpen });
    }
    if (isOpen) {
      await store.closeNoteWindowAction(noteId);
    } else {
      await store.openNoteWindow(noteId);
      store.bringNoteToFront(noteId);
    }
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: rect.x * scale,
    top: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
    borderRadius: 6,
    border: isOpen ? '2px solid #00ffc8' : '1.5px dashed #777',
    backgroundColor: isOpen ? 'rgba(0,255,200,0.18)' : 'rgba(255,255,255,0.06)',
    boxShadow: isOpen ? '0 0 12px rgba(0,255,200,0.4)' : 'none',
    opacity: isOpen ? 1 : 0.6,
    transition: 'all 0.1s ease',
    overflow: 'hidden',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
  };

  return (
    <div
      style={style}
      title={`Ghost: ${title}`}
      data-board-grid
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
    >
      <div
        className="px-1 py-0.5 select-none truncate"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: isOpen ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
          background: isOpen ? 'linear-gradient(to right, rgba(0,255,200,0.15), transparent)' : 'transparent',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          pointerEvents: 'none',
        }}
      >
        {title || 'Untitled'}
      </div>
    </div>
  );
}


