import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBoardStore } from '../../app/store';
import type { ExternalWindow, NoteRect } from '../../lib/types';
import { snapRectPosition } from '../../lib/utils';

export default function ExternalTiles({ scale }: { scale: number }) {
  const externalsRecord = useBoardStore((s) => s.externals || {});
  const externals = useMemo(() => Object.values(externalsRecord).filter((e: any) => !e.hidden), [externalsRecord]);
  return (
    <div className="absolute inset-0" style={{ zIndex: 3, pointerEvents: 'none' }}>
      {externals.map((e) => (
        <ExternalTile key={e.id} data={e} scale={scale} />
      ))}
    </div>
  );
}

function ExternalTile({ data, scale }: { data: ExternalWindow; scale: number }) {
  const moveExternal = useBoardStore((s) => s.moveExternal);
  const startClient = useRef<{ x: number; y: number } | null>(null);
  const startRect = useRef<NoteRect | null>(null);
  const [dragging, setDragging] = useState(false);
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

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    startClient.current = { x: e.clientX, y: e.clientY };
    startRect.current = { ...data.rect };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !startClient.current || !startRect.current) return;
    const dxCss = (e.clientX - startClient.current.x) / scale;
    const dyCss = (e.clientY - startClient.current.y) / scale;
    let nextX = Math.round(startRect.current.x + dxCss);
    let nextY = Math.round(startRect.current.y + dyCss);
    if (!altDown) {
      const s = snapRectPosition(nextX, nextY, 20);
      nextX = s.x; nextY = s.y;
    }
    // Optimistic local paint via store
    useBoardStore.setState((state) => {
      const e = state.externals?.[data.id];
      if (e) e.rect = { ...e.rect, x: nextX, y: nextY };
    });
  };

  const onPointerUp = async (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (!dragging || !startClient.current || !startRect.current) { setDragging(false); return; }
    const dxCss = (e.clientX - startClient.current.x) / scale;
    const dyCss = (e.clientY - startClient.current.y) / scale;
    let nextX = Math.round(startRect.current.x + dxCss);
    let nextY = Math.round(startRect.current.y + dyCss);
    if (!altDown) {
      const s = snapRectPosition(nextX, nextY, 20);
      nextX = s.x; nextY = s.y;
    }
    setDragging(false);
    await moveExternal(data.id, { ...data.rect, x: nextX, y: nextY });
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: data.rect.x * scale,
    top: data.rect.y * scale,
    width: data.rect.width * scale,
    height: data.rect.height * scale,
    borderRadius: 6,
    border: data.isBound ? '2px solid rgba(80,180,255,0.8)' : '2px dashed rgba(255,120,120,0.8)',
    backgroundColor: 'rgba(80,180,255,0.12)',
    boxShadow: '0 0 10px rgba(80,180,255,0.3)',
    color: 'white',
    overflow: 'hidden',
    userSelect: 'none',
    cursor: dragging ? 'grabbing' : 'grab',
    pointerEvents: 'auto',
  };

  const sizeLabel = `${Math.round(data.rect.width)}×${Math.round(data.rect.height)}`;

  return (
    <div style={style} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <div
        className="absolute top-0 left-0 right-0 px-1 py-0.5 text-xs font-semibold"
        style={{ background: 'linear-gradient(to right, rgba(80,180,255,0.18), transparent)' }}
      >
        {data.title || `HWND ${data.hwnd}`} {data.isBound ? '' : '(missing)'}
      </div>
      <div className="absolute bottom-1 right-1 text-[11px] px-1 py-0.5 rounded bg-black/40 border border-white/10">
        {sizeLabel}
      </div>
    </div>
  );
}


