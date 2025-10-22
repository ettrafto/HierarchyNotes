// General utility functions

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate a simple hash from a string
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Grid snapping utilities
export function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

export function snapWithThreshold(value: number, grid: number, thresholdPx: number, preferFloor = false): number {
  const snapped = snap(value, grid);
  return Math.abs(snapped - value) <= thresholdPx
    ? snapped
    : (preferFloor ? Math.floor(value / grid) * grid : value);
}

export function snapRectPosition(x: number, y: number, grid: number, thresholdPx = 6) {
  return {
    x: snapWithThreshold(x, grid, thresholdPx),
    y: snapWithThreshold(y, grid, thresholdPx),
  };
}

export function snapRectSize(w: number, h: number, grid: number, minW = grid * 4, minH = grid * 3, thresholdPx = 6) {
  const sw = Math.max(minW, snapWithThreshold(w, grid, thresholdPx, true));
  const sh = Math.max(minH, snapWithThreshold(h, grid, thresholdPx, true));
  return { width: sw, height: sh };
}

/**
 * Get a color from a predefined palette based on an index
 */
export function getColorForIndex(index: number): string {
  const colors = [
    '#64748b', // slate
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#06b6d4', // cyan
    '#f97316', // orange
  ];
  return colors[index % colors.length];
}

