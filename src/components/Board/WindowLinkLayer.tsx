// WindowLinkLayer - renders connections only between currently open windows
// This is separate from the board's LinkLayer and has its own toggle

import { useMemo } from 'react';
import { useBoardStore } from '../../app/store';
import { nearestAnchors } from '../../lib/geometry';
import { buildPath } from '../../lib/path';

export default function WindowLinkLayer({ scale = 1 }: { scale?: number }) {
  const notes = useBoardStore((state) => state.notes);
  const links = useBoardStore((state) => state.links);
  const show = useBoardStore((state) => state.ui.windows.showConnections);
  const connectStyle = useBoardStore((state) => state.ui.connectStyle);

  const paths = useMemo(() => {
    const linksArray = Object.values(links);
    
    const result = linksArray
      .map((link) => {
        // Only render note-to-note links
        if (link.source.kind !== 'note' || link.target.kind !== 'note') {
          return null;
        }
        
        const sourceNote = notes[link.source.id];
        const targetNote = notes[link.target.id];

        // CRITICAL: Only show if BOTH notes have their windows currently open
        if (!sourceNote || !targetNote) {
          return null;
        }
        if (!sourceNote.isOpen || !targetNote.isOpen) {
          return null;
        }

        const { source, target } = nearestAnchors(sourceNote.rect, targetNote.rect);
        const pathData = buildPath(source, target, connectStyle);

        return {
          link,
          pathData,
        } as const;
      })
      .filter((p): p is { link: typeof linksArray[number]; pathData: string } => p !== null);
    
    return result;
  }, [links, notes, connectStyle]);

  // Calculate SVG viewport (same logic as LinkLayer)
  const logicalWidth = scale > 0 ? (typeof window !== 'undefined' ? window.innerWidth / scale : 2048) : 2048;
  const logicalHeight = scale > 0 ? (typeof window !== 'undefined' ? window.innerHeight / scale : 1152) : 1152;

  const svgStyle = { 
    zIndex: 5, // Lower than LinkLayer (10) but above Grid (1-2)
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: `${logicalWidth}px`,
    height: `${logicalHeight}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    pointerEvents: 'none' as const,
    overflow: 'visible'
  };

  // Don't render if toggle is off (check AFTER all hooks)
  if (!show) {
    return null;
  }

  return (
    <svg 
      width={logicalWidth}
      height={logicalHeight}
      style={svgStyle}
      viewBox={`0 0 ${logicalWidth} ${logicalHeight}`}
    >
      <defs>
        <marker
          id="arrow-white-window"
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

      {paths.map((item) => {
        if (!item) return null;
        
        const { link, pathData } = item;
        const strokeWidth = 2 / scale;

        return (
          <g key={link.id}>
            <path
              d={pathData}
              stroke="white"
              strokeOpacity={0.9}
              strokeWidth={strokeWidth}
              fill="none"
              markerEnd={link.directed ? 'url(#arrow-white-window)' : undefined}
              style={{ 
                pointerEvents: 'none'
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

