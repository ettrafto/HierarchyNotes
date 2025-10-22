// Path building utilities for smooth and orthogonal connectors

import type { AnchorPoint, Point } from './types';

/**
 * Build a simple cubic path between two points
 */
export function cubicPath(from: Point, to: Point): string {
  const dx = (to.x - from.x);
  const dy = (to.y - from.y);
  const c1: Point = { x: from.x + dx * 0.5, y: from.y };
  const c2: Point = { x: to.x - dx * 0.5,   y: to.y };
  return `M ${from.x},${from.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${to.x},${to.y}`;
}

/**
 * Build a simple tidy orthogonal path
 */
export function orthoPath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  const horizontalFirst = Math.abs(to.x - from.x) > Math.abs(to.y - from.y);
  const p1 = horizontalFirst ? { x: midX, y: from.y } : { x: from.x, y: midY };
  const p2 = horizontalFirst ? { x: midX, y: to.y   } : { x: to.x,   y: midY };

  return `M ${from.x},${from.y} L ${p1.x},${p1.y} L ${p2.x},${p2.y} L ${to.x},${to.y}`;
}

/**
 * Build a smooth cubic Bezier path between two anchor points
 */
export function smoothPath(source: AnchorPoint, target: AnchorPoint): string {
  const { point: start, anchor: startAnchor } = source;
  const { point: end, anchor: endAnchor } = target;

  // Calculate control point offset based on anchor direction
  const offset = Math.abs(end.x - start.x) * 0.5;

  let cp1: Point;
  let cp2: Point;

  // Source control point
  switch (startAnchor) {
    case 'right':
      cp1 = { x: start.x + offset, y: start.y };
      break;
    case 'left':
      cp1 = { x: start.x - offset, y: start.y };
      break;
    case 'bottom':
      cp1 = { x: start.x, y: start.y + offset };
      break;
    case 'top':
      cp1 = { x: start.x, y: start.y - offset };
      break;
  }

  // Target control point
  switch (endAnchor) {
    case 'right':
      cp2 = { x: end.x + offset, y: end.y };
      break;
    case 'left':
      cp2 = { x: end.x - offset, y: end.y };
      break;
    case 'bottom':
      cp2 = { x: end.x, y: end.y + offset };
      break;
    case 'top':
      cp2 = { x: end.x, y: end.y - offset };
      break;
  }

  return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
}

/**
 * Build an orthogonal (right-angle) path between two anchor points
 */
export function orthogonalPath(source: AnchorPoint, target: AnchorPoint): string {
  const { point: start, anchor: startAnchor } = source;
  const { point: end, anchor: endAnchor } = target;

  const points: Point[] = [start];

  // Calculate intermediate points based on anchor directions
  const isHorizontalStart = startAnchor === 'left' || startAnchor === 'right';
  const isHorizontalEnd = endAnchor === 'left' || endAnchor === 'right';

  if (isHorizontalStart && isHorizontalEnd) {
    // Both horizontal
    const midX = (start.x + end.x) / 2;
    points.push({ x: midX, y: start.y });
    points.push({ x: midX, y: end.y });
  } else if (!isHorizontalStart && !isHorizontalEnd) {
    // Both vertical
    const midY = (start.y + end.y) / 2;
    points.push({ x: start.x, y: midY });
    points.push({ x: end.x, y: midY });
  } else if (isHorizontalStart && !isHorizontalEnd) {
    // Start horizontal, end vertical
    points.push({ x: end.x, y: start.y });
  } else {
    // Start vertical, end horizontal
    points.push({ x: start.x, y: end.y });
  }

  points.push(end);

  // Build path string
  return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
}

/**
 * Build a path based on style
 */
export function buildPath(
  source: AnchorPoint,
  target: AnchorPoint,
  style: 'smooth' | 'orthogonal'
): string {
  return style === 'smooth' ? smoothPath(source, target) : orthogonalPath(source, target);
}

