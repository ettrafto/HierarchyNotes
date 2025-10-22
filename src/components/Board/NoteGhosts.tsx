import { useMemo, useRef, useState } from 'react';
import { useBoardStore } from '../../app/store';
import { setNotePosition } from '../../app/ipc';

export default function NoteGhosts({ scale }: { scale: number }) {
  const notesRecord = useBoardStore((s) => s.notes);
  const notes = useMemo(() => Object.values(notesRecord), [notesRecord]);


  return (
    <div className="absolute inset-0" style={{ zIndex: 2 }}>
      {notes.map((n) => (
        <Ghost key={n.id} noteId={n.id} title={n.title} rect={n.rect} isOpen={!!n.isOpen} scale={scale} />
      ))}
    </div>
  );
}

function Ghost({ noteId, title, rect, isOpen, scale }: { noteId: string; title: string; rect: { x: number; y: number; width: number; height: number }; isOpen: boolean; scale: number }) {
  const startClient = useRef<{ x: number; y: number } | null>(null);
  const startRect = useRef<{ x: number; y: number } | null>(null);
  const lastClient = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const didDrag = useRef(false);
  
  // Get connect mode state
  const mode = useBoardStore((s) => s.ui.mode);
  const sourceId = useBoardStore((s) => s.linkingDraft.sourceNoteId);
  const isConnectMode = mode === 'connect';
  const isConnectSource = isConnectMode && sourceId === noteId;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    startClient.current = { x: e.clientX, y: e.clientY };
    startRect.current = { x: rect.x, y: rect.y };
    dragging.current = true;
    setIsDragging(true);
    lastClient.current = { x: e.clientX, y: e.clientY };
    didDrag.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !startClient.current || !startRect.current) return;
    e.preventDefault();
    const dxCss = (e.clientX - startClient.current.x) / scale;
    const dyCss = (e.clientY - startClient.current.y) / scale;
    const nextX = Math.round(startRect.current.x + dxCss);
    const nextY = Math.round(startRect.current.y + dyCss);
    useBoardStore.getState().updateNoteRect(noteId, { ...rect, x: nextX, y: nextY }, { fromDrag: true });
    lastClient.current = { x: e.clientX, y: e.clientY };
    // Mark as drag if movement exceeds small threshold (2 CSS px)
    if (!didDrag.current) {
      const moved = Math.abs(dxCss) > 2 || Math.abs(dyCss) > 2;
      if (moved) didDrag.current = true;
    }
  };

  const finalizeDrag = async (clientX: number, clientY: number) => {
    if (!dragging.current || !startClient.current || !startRect.current) return;
    const dxCss = (clientX - startClient.current.x) / scale;
    const dyCss = (clientY - startClient.current.y) / scale;
    const nextX = Math.round(startRect.current.x + dxCss);
    const nextY = Math.round(startRect.current.y + dyCss);
    // Clean up drag state BEFORE any async work to avoid sticky drag
    dragging.current = false;
    startClient.current = null;
    startRect.current = null;
    lastClient.current = null;
    setIsDragging(false);

    // Update store immediately
    useBoardStore.getState().updateNoteRect(noteId, { ...rect, x: nextX, y: nextY }, { fromDrag: true });
    useBoardStore.getState().setDragEchoBlock(noteId, 300);

    // Only move OS window if it's open
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
    // Cancel without moving the OS window
    dragging.current = false;
    startClient.current = null;
    startRect.current = null;
    lastClient.current = null;
    setIsDragging(false);
  };

  const onPointerLeave = async () => {
    // If pointer leaves while dragging, finalize with last known position (only if open)
    if (dragging.current) {
      if (lastClient.current) {
        await finalizeDrag(lastClient.current.x, lastClient.current.y);
      } else {
        // Nothing to finalize; just cancel
        dragging.current = false;
        startClient.current = null;
        startRect.current = null;
        lastClient.current = null;
        setIsDragging(false);
      }
    }
  };

  const onClick = async () => {
    // Ignore click if a drag occurred (even after pointer up)
    if (isDragging || didDrag.current) {
      didDrag.current = false; // reset for next interaction
      return;
    }
    const store = useBoardStore.getState();
    
    // Handle connect mode
    if (store.ui.mode === 'connect') {
      const src = store.linkingDraft.sourceNoteId;
      if (!src) {
        store.startConnect(noteId);
      } else {
        store.completeConnect(noteId);
      }
      return;
    }
    
    // Default behavior: toggle window
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

  // Determine styling based on mode
  let borderStyle = isOpen ? '2px solid #00ffc8' : '1.5px dashed #777';
  let bgColor = isOpen ? 'rgba(0,255,200,0.18)' : 'rgba(255,255,255,0.06)';
  let boxShadow = isOpen ? '0 0 12px rgba(0,255,200,0.4)' : 'none';
  let cursorStyle = isDragging ? 'grabbing' : 'grab';
  
  if (isConnectMode) {
    cursorStyle = 'pointer';
    if (isConnectSource) {
      borderStyle = '2px solid #60a5fa';
      bgColor = 'rgba(96, 165, 250, 0.2)';
      boxShadow = '0 0 16px rgba(96, 165, 250, 0.6)';
    } else {
      borderStyle = '2px dashed #60a5fa';
      bgColor = 'rgba(96, 165, 250, 0.1)';
    }
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: rect.x * scale,
    top: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
    borderRadius: 6,
    border: borderStyle,
    backgroundColor: bgColor,
    boxShadow: boxShadow,
    opacity: isOpen ? 1 : 0.6,
    transition: 'all 0.1s ease',
    overflow: 'hidden',
    cursor: cursorStyle,
    userSelect: 'none',
  };

  return (
    <div
      style={style}
      title={`Ghost: ${title}`}
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
      {isOpen && (
        <div
          className="px-1 pt-1 select-none"
          style={{
            fontSize: 11,
            lineHeight: '14px',
            color: 'rgba(255,255,255,0.8)',
            pointerEvents: 'none',
          }}
        >
          {(rect as any).content ? String((rect as any).content).slice(0, 160) : ''}
        </div>
      )}
    </div>
  );
}


