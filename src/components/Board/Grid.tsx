// Grid background component

import { useBoardStore } from '../../app/store';

export default function Grid() {
  const ui = useBoardStore((state) => state.ui);

  return (
    <div
      className="absolute inset-0 grid-background"
      style={{
        '--grid-density': `${ui.gridDensity}px`,
      } as React.CSSProperties}
    />
  );
}

