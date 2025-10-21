// Path building utilities for smooth and orthogonal connectors

import type { AnchorPoint, Point } from './types';

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

