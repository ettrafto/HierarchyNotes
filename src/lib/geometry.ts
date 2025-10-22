// Geometry utilities for computing anchor points and paths

import type { NoteRect, Point, Anchor, AnchorPoint } from './types';

/**
 * Get the center point of a rect
 */
export function centerOf(rect: NoteRect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

/**
 * Get anchor points for a rect (top, bottom, left, right centers)
 */
export function getAnchorPoints(rect: NoteRect): Record<Anchor, Point> {
  return {
    top: { x: rect.x + rect.width / 2, y: rect.y },
    bottom: { x: rect.x + rect.width / 2, y: rect.y + rect.height },
    left: { x: rect.x, y: rect.y + rect.height / 2 },
    right: { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
  };
}

/**
 * Calculate distance between two points
 */
export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate Manhattan distance between two points
 */
export function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Type for anchor pair with keys
 */
export type AnchorPair = { 
  fromKey: Anchor;
  toKey: Anchor;
  from: Point;
  to: Point;
};

/**
 * Choose the best anchor pair: prefer horizontal alignment for wide gaps, vertical for tall gaps.
 */
export function bestAnchorPair(a: NoteRect, b: NoteRect): AnchorPair {
  const A = getAnchorPoints(a);
  const B = getAnchorPoints(b);

  const candidates: AnchorPair[] = [
    { fromKey: 'right', toKey: 'left',   from: A.right,  to: B.left   },
    { fromKey: 'left',  toKey: 'right',  from: A.left,   to: B.right  },
    { fromKey: 'bottom', toKey: 'top',   from: A.bottom, to: B.top    },
    { fromKey: 'top',   toKey: 'bottom', from: A.top,    to: B.bottom },
  ];

  // Heuristic: evaluate by manhattan distance with directional bias
  const dx = (a.x + a.width / 2) - (b.x + b.width / 2);
  const dy = (a.y + a.height / 2) - (b.y + b.height / 2);
  const horizFirst = Math.abs(dx) > Math.abs(dy);

  const scored = candidates.map(c => {
    const d = manhattan(c.from, c.to);
    const bias =
      (horizFirst && (c.fromKey === 'right' || c.fromKey === 'left')) ? 0 : 
      (!horizFirst && (c.fromKey === 'top' || c.fromKey === 'bottom')) ? 0 : 8; // small bias
    return { c, score: d + bias };
  });

  scored.sort((p, q) => p.score - q.score);
  return scored[0].c;
}

/**
 * Find the nearest anchor points between two rects (legacy compatibility)
 */
export function nearestAnchors(
  rectA: NoteRect,
  rectB: NoteRect
): { source: AnchorPoint; target: AnchorPoint } {
  const pair = bestAnchorPair(rectA, rectB);
  return {
    source: { point: pair.from, anchor: pair.fromKey },
    target: { point: pair.to, anchor: pair.toKey }
  };
}

/**
 * Snap a point to grid
 */
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Snap a rect to grid
 */
export function snapRectToGrid(rect: NoteRect, gridSize: number): NoteRect {
  return {
    x: Math.round(rect.x / gridSize) * gridSize,
    y: Math.round(rect.y / gridSize) * gridSize,
    width: rect.width,
    height: rect.height,
  };
}

