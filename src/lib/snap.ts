export function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

export function snapWithThreshold(value: number, grid: number, thresholdPx: number, preferFloor = false): number {
  const snapped = snap(value, grid);
  if (Math.abs(snapped - value) <= thresholdPx) return snapped;
  return preferFloor ? Math.floor(value / grid) * grid : value;
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


