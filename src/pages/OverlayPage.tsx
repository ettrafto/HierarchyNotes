// OverlayPage - Transparent fullscreen overlay that draws connections between note windows

import { useMemo, useState, useEffect } from 'react';
import { onOverlayStateSync, type OverlayStateSyncPayload } from '../app/ipc';
import { nearestAnchors } from '../lib/geometry';
import { buildPath } from '../lib/path';

export default function OverlayPage() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  OverlayPage Component Rendering          ║');
  console.log('╚═══════════════════════════════════════════╝');

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
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║  [Overlay] Setting up IPC listener        ║');
    console.log('╚═══════════════════════════════════════════╝');
    
    let unlisten: (() => void) | null = null;
    
    onOverlayStateSync((payload) => {
      console.log('╔═══════════════════════════════════════════╗');
      console.log('║  [Overlay] STATE SYNC RECEIVED            ║');
      console.log('╠═══════════════════════════════════════════╣');
      console.log('  Notes count:', Object.keys(payload.notes).length);
      console.log('  Links count:', Object.keys(payload.links).length);
      console.log('  Show connections:', payload.showConnections);
      console.log('  Connect style:', payload.connectStyle);
      
      // Log open windows
      const openNotes = Object.values(payload.notes).filter(n => n.isOpen);
      console.log('  Open windows:', openNotes.length);
      openNotes.forEach(n => {
        console.log(`    - ${n.id}: rect=`, n.rect);
      });
      
      // Log links
      if (Object.keys(payload.links).length > 0) {
        console.log('  Links:');
        Object.values(payload.links).forEach(link => {
          console.log(`    - ${link.id}: ${(link.source as any).id} -> ${(link.target as any).id}`);
        });
      }
      
      console.log('╚═══════════════════════════════════════════╝');
      
      setState(payload);
      setSyncCount(c => c + 1);
    }).then((fn) => {
      unlisten = fn;
      console.log('✅ [Overlay] IPC listener registered successfully');
    }).catch((err) => {
      console.error('❌ [Overlay] Failed to register IPC listener:', err);
    });

    return () => {
      console.log('[Overlay] Cleaning up IPC listener');
      if (unlisten) unlisten();
    };
  }, []);

  console.log('[Overlay] Render - sync count:', syncCount, 'state:', {
    notes: Object.keys(state.notes).length,
    links: Object.keys(state.links).length,
  });

  const { notes, links, showConnections: show, connectStyle } = state;

  const paths = useMemo(() => {
    console.log('[Overlay useMemo] Computing paths...');
    console.log('  Show:', show);
    console.log('  Links:', Object.keys(links).length);
    console.log('  Notes:', Object.keys(notes).length);
    
    if (!show) {
      console.log('  ❌ Show is false, returning empty array');
      return [];
    }

    const linksArray = Object.values(links);
    console.log('  Processing', linksArray.length, 'links');

    const result = linksArray
      .map((link, idx) => {
        console.log(`  [Path ${idx}] Link ${link.id}`);
        
        if (link.source.kind !== 'note' || link.target.kind !== 'note') {
          console.log(`    ❌ Not note-to-note`);
          return null;
        }
        
        const sourceNote = notes[link.source.id];
        const targetNote = notes[link.target.id];

        console.log(`    Source (${link.source.id}):`, sourceNote ? 'exists' : 'MISSING', sourceNote?.isOpen ? 'OPEN' : 'closed');
        console.log(`    Target (${link.target.id}):`, targetNote ? 'exists' : 'MISSING', targetNote?.isOpen ? 'OPEN' : 'closed');

        if (!sourceNote || !targetNote) {
          console.log(`    ❌ Missing note(s)`);
          return null;
        }
        
        if (!sourceNote.isOpen || !targetNote.isOpen) {
          console.log(`    ❌ Not both open`);
          return null;
        }

        const { source, target } = nearestAnchors(sourceNote.rect, targetNote.rect);
        const pathData = buildPath(source, target, connectStyle);

        console.log(`    ✅ Path computed: ${pathData.substring(0, 50)}...`);

        return { link, pathData };
      })
      .filter(p => p !== null);
    
    console.log('[Overlay useMemo] Result:', result.length, 'paths');
    return result;
  }, [links, notes, connectStyle, show]);

  console.log('[Overlay] Final render - paths:', paths.length, 'show:', show);

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
      {/* Debug info */}
      <div style={{
        position: 'fixed',
        top: 10,
        left: 10,
        background: 'rgba(0,0,0,0.8)',
        color: 'lime',
        padding: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        pointerEvents: 'none',
        zIndex: 9999,
      }}>
        OVERLAY ACTIVE<br/>
        Syncs: {syncCount}<br/>
        Notes: {Object.keys(notes).length}<br/>
        Links: {Object.keys(links).length}<br/>
        Paths: {paths.length}<br/>
        Show: {show ? 'YES' : 'NO'}
      </div>

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

        {/* Test line always visible */}
        <line x1="100" y1="100" x2="500" y2="100" stroke="red" strokeWidth="5" />
        <circle cx="300" cy="100" r="20" fill="yellow" />

        {paths.map((item, idx) => {
          if (!item) return null;
          
          const { link, pathData } = item;
          
          console.log(`[Overlay RENDER] Drawing path ${idx} for link ${link.id}`);

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

