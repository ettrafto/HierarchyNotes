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
 * Find the nearest anchor points between two rects
 */
export function nearestAnchors(
  rectA: NoteRect,
  rectB: NoteRect
): { source: AnchorPoint; target: AnchorPoint } {
  const anchorsA = getAnchorPoints(rectA);
  const anchorsB = getAnchorPoints(rectB);

  let minDist = Infinity;
  let bestSource: AnchorPoint = { point: anchorsA.right, anchor: 'right' };
  let bestTarget: AnchorPoint = { point: anchorsB.left, anchor: 'left' };

  // Find the pair with minimum distance
  (Object.keys(anchorsA) as Anchor[]).forEach((anchorA) => {
    (Object.keys(anchorsB) as Anchor[]).forEach((anchorB) => {
      const dist = distance(anchorsA[anchorA], anchorsB[anchorB]);
      if (dist < minDist) {
        minDist = dist;
        bestSource = { point: anchorsA[anchorA], anchor: anchorA };
        bestTarget = { point: anchorsB[anchorB], anchor: anchorB };
      }
    });
  });

  return { source: bestSource, target: bestTarget };
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

