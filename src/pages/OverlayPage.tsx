// OverlayPage - Transparent fullscreen overlay that draws connections between note windows

import { useMemo, useState, useEffect } from 'react';
import { onOverlayStateSync, type OverlayStateSyncPayload } from '../app/ipc';
import { nearestAnchors } from '../lib/geometry';
import { buildPath } from '../lib/path';
import { DEBUG, debug } from '../lib/debug';

export default function OverlayPage() {
  debug.log('OVERLAY_PAGE', '╔═══════════════════════════════════════════╗');
  debug.log('OVERLAY_PAGE', '║  OverlayPage Component Rendering          ║');
  debug.log('OVERLAY_PAGE', '╚═══════════════════════════════════════════╝');

  // Local state synced from Board via IPC
  const [state, setState] = useState<OverlayStateSyncPayload>({
    notes: {},
    links: {},
    showConnections: true,
    connectStyle: 'smooth',
  });

  const [syncCount, setSyncCount] = useState(0);

  // Listen for state sync from Board
  useEffect(() => {
    debug.log('OVERLAY_PAGE', '╔═══════════════════════════════════════════╗');
    debug.log('OVERLAY_PAGE', '║  [Overlay] Setting up IPC listener        ║');
    debug.log('OVERLAY_PAGE', '╚═══════════════════════════════════════════╝');
    
    let unlisten: (() => void) | null = null;
    
    onOverlayStateSync((payload) => {
      debug.log('OVERLAY_PAGE', '╔═══════════════════════════════════════════╗');
      debug.log('OVERLAY_PAGE', '║  [Overlay] STATE SYNC RECEIVED            ║');
      debug.log('OVERLAY_PAGE', '╠═══════════════════════════════════════════╣');
      debug.log('OVERLAY_PAGE', '  Notes count:', Object.keys(payload.notes).length);
      debug.log('OVERLAY_PAGE', '  Links count:', Object.keys(payload.links).length);
      debug.log('OVERLAY_PAGE', '  Show connections:', payload.showConnections);
      debug.log('OVERLAY_PAGE', '  Connect style:', payload.connectStyle);
      
      const openNotes = Object.values(payload.notes).filter(n => n.isOpen);
      debug.log('OVERLAY_PAGE', '  Open windows:', openNotes.length);
      openNotes.forEach(n => {
        debug.log('OVERLAY_PAGE', `    - ${n.id}: rect=`, n.rect);
      });
      
      if (Object.keys(payload.links).length > 0) {
        debug.log('OVERLAY_PAGE', '  Links:');
        Object.values(payload.links).forEach(link => {
          debug.log('OVERLAY_PAGE', `    - ${link.id}: ${(link.source as any).id} -> ${(link.target as any).id}`);
        });
      }
      
      debug.log('OVERLAY_PAGE', '╚═══════════════════════════════════════════╝');
      
      setState(payload);
      setSyncCount(c => c + 1);
    }).then((fn) => {
      unlisten = fn;
      debug.log('OVERLAY_PAGE', '✅ [Overlay] IPC listener registered successfully');
    }).catch((err) => {
      debug.forceError('❌ [Overlay] Failed to register IPC listener:', err);
    });

    return () => {
      debug.log('OVERLAY_PAGE', '[Overlay] Cleaning up IPC listener');
      if (unlisten) unlisten();
    };
  }, []);

  debug.log('OVERLAY_PAGE', '[Overlay] Render - sync count:', syncCount, 'state:', {
    notes: Object.keys(state.notes).length,
    links: Object.keys(state.links).length,
  });

  const { notes, links, showConnections: show, connectStyle } = state;

  const paths = useMemo(() => {
    debug.log('CONNECTIONS', '[Overlay useMemo] Computing paths...');
    debug.log('CONNECTIONS', '  Show:', show);
    debug.log('CONNECTIONS', '  Links:', Object.keys(links).length);
    debug.log('CONNECTIONS', '  Notes:', Object.keys(notes).length);
    
    if (!show) {
      debug.log('CONNECTIONS', '  ❌ Show is false, returning empty array');
      return [];
    }

    const linksArray = Object.values(links);
    debug.log('CONNECTIONS', '  Processing', linksArray.length, 'links');

    const result = linksArray
      .map((link, idx) => {
        debug.log('CONNECTIONS', `  [Path ${idx}] Link ${link.id}`);
        
        if (link.source.kind !== 'note' || link.target.kind !== 'note') {
          debug.log('CONNECTIONS', `    ❌ Not note-to-note`);
          return null;
        }
        
        const sourceNote = notes[link.source.id];
        const targetNote = notes[link.target.id];

        debug.log('CONNECTIONS', `    Source (${link.source.id}):`, sourceNote ? 'exists' : 'MISSING', sourceNote?.isOpen ? 'OPEN' : 'closed');
        debug.log('CONNECTIONS', `    Target (${link.target.id}):`, targetNote ? 'exists' : 'MISSING', targetNote?.isOpen ? 'OPEN' : 'closed');

        if (!sourceNote || !targetNote) {
          debug.log('CONNECTIONS', `    ❌ Missing note(s)`);
          return null;
        }
        
        if (!sourceNote.isOpen || !targetNote.isOpen) {
          debug.log('CONNECTIONS', `    ❌ Not both open`);
          return null;
        }

        const { source, target } = nearestAnchors(sourceNote.rect, targetNote.rect);
        const pathData = buildPath(source, target, connectStyle);

        debug.log('CONNECTIONS', `    ✅ Path computed: ${pathData.substring(0, 50)}...`);

        return { link, pathData };
      })
      .filter(p => p !== null);
    
    debug.log('CONNECTIONS', '[Overlay useMemo] Result:', result.length, 'paths');
    return result;
  }, [links, notes, connectStyle, show]);

  debug.log('OVERLAY_PAGE', '[Overlay] Final render - paths:', paths.length, 'show:', show);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: 'transparent',
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        <defs>
          <marker
            id="arrow-overlay-white"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="white" />
          </marker>
        </defs>

        {paths.map((item, idx) => {
          if (!item) return null;
          
          const { link, pathData } = item;
          
          debug.log('CONNECTIONS', `[Overlay RENDER] Drawing path ${idx} for link ${link.id}`);

          return (
            <g key={link.id}>
              <path
                d={pathData}
                stroke="white"
                strokeOpacity={0.9}
                strokeWidth={2}
                fill="none"
                markerEnd={link.directed ? 'url(#arrow-overlay-white)' : undefined}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

