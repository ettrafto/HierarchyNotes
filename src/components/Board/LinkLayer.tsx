// LinkLayer component - renders SVG connectors between notes

import { useMemo } from 'react';
import { useBoardStore } from '../../app/store';
import { nearestAnchors } from '../../lib/geometry';
import { buildPath } from '../../lib/path';

export default function LinkLayer() {
  // Use separate stable selectors to avoid creating new objects every render
  const linksRecord = useBoardStore((state) => state.links);
  const linksArray = useMemo(() => Object.values(linksRecord), [linksRecord]);
  const notesObj = useBoardStore((state) => state.notes);
  const connectStyle = useBoardStore((state) => state.ui.connectStyle);
  const selectedLinkIds = useBoardStore((state) => state.ui.selectedLinkIds);

  const paths = useMemo(() => {
    return linksArray
      .map((link) => {
        const sourceNote = notesObj[link.sourceId];
        const targetNote = notesObj[link.targetId];

        if (!sourceNote || !targetNote) return null;

        const { source, target } = nearestAnchors(sourceNote.rect, targetNote.rect);
        const pathData = buildPath(source, target, connectStyle);

        return {
          link,
          pathData,
        } as const;
      })
      .filter((p): p is { link: typeof linksArray[number]; pathData: string } => p !== null);
  }, [linksArray, notesObj, connectStyle]);

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="currentColor" className="text-foreground/30" />
        </marker>
        <marker
          id="arrowhead-selected"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="currentColor" className="text-accent-foreground/70" />
        </marker>
      </defs>

      {paths.map((item) => {
        if (!item) return null;
        
        const { link, pathData } = item;
        const isSelected = selectedLinkIds.includes(link.id);
        const markerId = isSelected ? 'arrowhead-selected' : 'arrowhead';

        return (
          <g key={link.id}>
            <path
              d={pathData}
              className={isSelected ? 'link-path-selected' : 'link-path'}
              markerEnd={link.directed ? `url(#${markerId})` : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}

