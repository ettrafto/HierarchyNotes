import React, { useState } from 'react';
import { useBoardStore, resizingViaBoard } from '../../app/store';
import { Handle, resizeFromHandle, snapRectFullToGrid } from '../../lib/geometry';
import { moveResizeNoteWindow } from '../../app/ipc';
import { debug } from '../../lib/debug';

// Edge zones for detecting resize areas
type EdgeZone = Handle | null;

type Props = { 
  id: string /* rawId */;
  scale: number;
};

export default function NoteFrame({ id, scale }: Props) {
  const note = useBoardStore((s) => s.notes?.[id]);
  const selected = useBoardStore((s) => s.ui?.selectedNoteIds?.includes(id) ?? false);
  const mode = useBoardStore((s) => s.ui?.mode ?? 'select');
  const snapToGrid = useBoardStore((s) => s.ui?.snapToGrid ?? false);
  const gridDensity = useBoardStore((s) => s.ui?.gridDensity ?? 40);
  const draft = useBoardStore((s) => s.ui?.resizeDrafts?.[id]);
  const begin = useBoardStore((s) => s.beginResizeDraft);
  const update = useBoardStore((s) => s.updateResizeDraft);
  const commit = useBoardStore((s) => s.commitResizeDraft);
  const cancel = useBoardStore((s) => s.cancelResizeDraft);

  const [isDragging, setIsDragging] = useState(false);

  debug.log('RESIZE', `[NoteFrame] Render ${id}`, {
    noteExists: !!note,
    isOpen: note?.isOpen,
    selected,
    mode,
    scale,
  });

  if (!note) {
    debug.log('RESIZE', `[NoteFrame] Skipping ${id} (note not found)`);
    return null;
  }

  const rect = draft ?? note.rect;
  
  // In resize mode with selection, container captures events for edges
  // Otherwise, pass through to NoteGhosts below
  const containerPointerEvents = (selected && mode === 'resize') ? 'auto' : 'none';
  
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: rect.x * scale,
    top: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
    pointerEvents: containerPointerEvents,
  };

  const edgeThickness = 8; // pixels for hit area

  function startResize(handle: Handle, startX: number, startY: number) {
    debug.log('RESIZE', `[NoteFrame] startResize ${id}`, { handle, startX, startY, scale });
    setIsDragging(true);
    const base = draft ?? note.rect;
    const isNoteOpen = note.isOpen; // Capture current state
    begin(id, base);
    debug.log('RESIZE', `[NoteFrame] Begin resize draft`, { base, isNoteOpen });

    const onMove = (ev: MouseEvent) => {
      try {
        // Account for scale when calculating deltas
        const dx = (ev.clientX - startX) / scale;
        const dy = (ev.clientY - startY) / scale;
        let next = resizeFromHandle(base, dx, dy, handle);
        if (snapToGrid) next = snapRectFullToGrid(next, gridDensity);
        debug.log('RESIZE', `[NoteFrame] Update resize`, { dx, dy, next });
        update(id, next);
      } catch (err) {
        debug.error('RESIZE', `[NoteFrame] Error in onMove`, err);
      }
    };

    const onUp = async () => {
      debug.log('RESIZE', `[NoteFrame] Resize complete, committing...`);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setIsDragging(false);
      
      const finalRect = commit(id);
      debug.log('RESIZE', `[NoteFrame] Committed rect`, { finalRect, isNoteOpen });
      if (finalRect) {
        // Only resize the OS window if it's actually open
        if (isNoteOpen) {
          try {
            resizingViaBoard.add(id);
            debug.log('RESIZE', `[NoteFrame] Calling moveResizeNoteWindow`, { id, finalRect });
            await moveResizeNoteWindow(id, finalRect);
            debug.log('RESIZE', `[NoteFrame] moveResizeNoteWindow completed`);
          } catch (err) {
            debug.error('RESIZE', `[NoteFrame] moveResizeNoteWindow failed`, err);
          } finally {
            setTimeout(() => resizingViaBoard.delete(id), 300);
          }
        } else {
          debug.log('RESIZE', `[NoteFrame] Note not open, skipping OS window resize`);
        }
      } else {
        debug.warn('RESIZE', `[NoteFrame] No final rect, canceling`);
        cancel(id);
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    debug.log('RESIZE', `[NoteFrame] Event listeners attached`);
  }

  // Only show resize edges when selected and in resize mode
  if (!selected || mode !== 'resize') {
    debug.log('RESIZE', `[NoteFrame] Not showing edges for ${id}`, { selected, mode });
    return null; // Don't render anything when not in resize mode
  }

  debug.log('RESIZE', `[NoteFrame] Showing resize edges for ${id}`);

  // Edge overlay components - these capture pointer events
  const edgeOverlays = [
    // Corners (larger hit area, drawn first for proper z-layering)
    { handle: 'nw' as Handle, style: { top: 0, left: 0, width: edgeThickness * 2, height: edgeThickness * 2 } },
    { handle: 'ne' as Handle, style: { top: 0, right: 0, width: edgeThickness * 2, height: edgeThickness * 2 } },
    { handle: 'sw' as Handle, style: { bottom: 0, left: 0, width: edgeThickness * 2, height: edgeThickness * 2 } },
    { handle: 'se' as Handle, style: { bottom: 0, right: 0, width: edgeThickness * 2, height: edgeThickness * 2 } },
    // Edges
    { handle: 'n' as Handle, style: { top: 0, left: edgeThickness * 2, right: edgeThickness * 2, height: edgeThickness } },
    { handle: 's' as Handle, style: { bottom: 0, left: edgeThickness * 2, right: edgeThickness * 2, height: edgeThickness } },
    { handle: 'w' as Handle, style: { left: 0, top: edgeThickness * 2, bottom: edgeThickness * 2, width: edgeThickness } },
    { handle: 'e' as Handle, style: { right: 0, top: edgeThickness * 2, bottom: edgeThickness * 2, width: edgeThickness } },
  ];

  return (
    <div 
      style={containerStyle} 
      onClick={(e) => {
        // Prevent clicks in the center from bubbling to NoteGhosts when in resize mode
        if (selected && mode === 'resize') {
          debug.log('RESIZE', `[NoteFrame] Container clicked, stopping propagation`);
          e.stopPropagation();
        }
      }}
    >
      {edgeOverlays.map(({ handle, style }) => (
        <div
          key={handle}
          style={{
            position: 'absolute',
            ...style,
            cursor: cursorFor(handle),
            // Invisible resize handles - only visible on hover
            backgroundColor: 'transparent',
          }}
          onMouseDown={(e) => {
            debug.log('RESIZE', `[NoteFrame] Edge mousedown`, { handle, noteId: id, button: e.button });
            e.stopPropagation();
            e.preventDefault();
            startResize(handle, e.clientX, e.clientY);
          }}
          onMouseEnter={() => {
            debug.log('RESIZE', `[NoteFrame] Mouse enter edge`, { handle });
          }}
          onMouseLeave={() => {
            debug.log('RESIZE', `[NoteFrame] Mouse leave edge`, { handle });
          }}
        />
      ))}
    </div>
  );
}

function cursorFor(h: Handle): string {
  switch (h) {
    case 'n': return 'n-resize';
    case 's': return 's-resize';
    case 'e': return 'e-resize';
    case 'w': return 'w-resize';
    case 'ne': return 'ne-resize';
    case 'nw': return 'nw-resize';
    case 'se': return 'se-resize';
    case 'sw': return 'sw-resize';
  }
}

