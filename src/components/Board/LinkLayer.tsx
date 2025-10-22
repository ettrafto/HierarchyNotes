// LinkLayer component - renders SVG connectors between notes

import { useMemo } from 'react';
import { useBoardStore } from '../../app/store';
import { nearestAnchors } from '../../lib/geometry';
import { buildPath } from '../../lib/path';

export default function LinkLayer({ scale = 1 }: { scale?: number }) {
  // Use separate stable selectors to avoid creating new objects every render
  const linksRecord = useBoardStore((state) => state.links);
  const linksArray = useMemo(() => Object.values(linksRecord), [linksRecord]);
  const notesObj = useBoardStore((state) => state.notes);
  const connectStyle = useBoardStore((state) => state.ui.connectStyle);
  const selectedLinkIds = useBoardStore((state) => state.ui.selectedLinkIds);
  const mode = useBoardStore((state) => state.ui.mode);
  const deleteLink = useBoardStore((state) => state.deleteLink);

  const paths = useMemo(() => {
    const result = linksArray
      .map((link) => {
        // Extract note IDs from endpoints (skip subtask endpoints for now)
        if (link.source.kind !== 'note' || link.target.kind !== 'note') {
          return null;
        }
        
        const sourceNote = notesObj[link.source.id];
        const targetNote = notesObj[link.target.id];

        if (!sourceNote || !targetNote) {
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
  }, [linksArray, notesObj, connectStyle, scale]);

  // Calculate the SVG viewport size (unscaled logical size)
  // The board container is scale.width * scale.factor wide/tall
  // But we need the SVG to be in logical coordinates BEFORE scaling
  const logicalWidth = scale > 0 ? (typeof window !== 'undefined' ? window.innerWidth / scale : 2048) : 2048;
  const logicalHeight = scale > 0 ? (typeof window !== 'undefined' ? window.innerHeight / scale : 1152) : 1152;

  const svgStyle = { 
    zIndex: 10,
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

  return (
    <svg 
      width={logicalWidth}
      height={logicalHeight}
      style={svgStyle}
      viewBox={`0 0 ${logicalWidth} ${logicalHeight}`}
    >
      <defs>
        <marker
          id="arrow-white"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="white" />
        </marker>
        <marker
          id="arrow-selected"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#60a5fa" />
        </marker>
      </defs>

      {paths.map((item) => {
        if (!item) return null;
        
        const { link, pathData } = item;
        const isSelected = selectedLinkIds.includes(link.id);
        const strokeWidth = isSelected ? 3 / scale : 2 / scale;
        const isConnectMode = mode === 'connect';

        const handleLinkClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (isConnectMode) {
            // In connect mode, clicking a link deletes it
            deleteLink(link.id);
          }
        };

        return (
          <g key={link.id}>
            {/* Invisible wider path for easier clicking */}
            <path
              d={pathData}
              stroke="transparent"
              strokeWidth={Math.max(12 / scale, strokeWidth + 8 / scale)}
              fill="none"
              style={{ 
                pointerEvents: isConnectMode ? 'stroke' : 'none',
                cursor: isConnectMode ? 'pointer' : 'default'
              }}
              onClick={handleLinkClick}
            />
            {/* Visible path */}
            <path
              d={pathData}
              stroke={isSelected ? '#60a5fa' : 'white'}
              strokeOpacity={isSelected ? 1 : 0.9}
              strokeWidth={strokeWidth}
              fill="none"
              markerEnd={link.directed ? (isSelected ? 'url(#arrow-selected)' : 'url(#arrow-white)') : undefined}
              style={{ 
                pointerEvents: isConnectMode ? 'stroke' : 'none',
                cursor: isConnectMode ? 'pointer' : 'default',
                transition: 'stroke 0.15s ease, stroke-width 0.15s ease'
              }}
              className={isConnectMode ? 'link-hoverable' : ''}
              onClick={handleLinkClick}
            />
          </g>
        );
      })}
    </svg>
  );
}

