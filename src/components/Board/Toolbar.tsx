// Toolbar component - mode and style controls

import { MousePointer2, Link2, Grid3x3, Minus, Menu } from 'lucide-react';
import { useBoardStore } from '../../app/store';

export default function Toolbar() {
  const ui = useBoardStore((state) => state.ui);
  const setMode = useBoardStore((state) => state.setMode);
  const toggleSnapToGrid = useBoardStore((state) => state.toggleSnapToGrid);
  const setConnectStyle = useBoardStore((state) => state.setConnectStyle);
  const toggleSidebar = useBoardStore((state) => state.toggleSidebar);

  return (
    <div className="toolbar glass-effect">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="toolbar-button"
          title="Toggle notes list"
        >
          <Menu size={16} />
        </button>
        <span className="text-sm font-medium text-muted-foreground">Mode:</span>
        
        <button
          onClick={() => setMode('select')}
          className={`toolbar-button flex items-center gap-2 ${
            ui.mode === 'select' ? 'toolbar-button-active' : ''
          }`}
          title="Select mode"
        >
          <MousePointer2 size={16} />
          <span>Select</span>
        </button>

        <button
          onClick={() => setMode('connect')}
          className={`toolbar-button flex items-center gap-2 ${
            ui.mode === 'connect' ? 'toolbar-button-active' : ''
          }`}
          title="Connect mode"
        >
          <Link2 size={16} />
          <span>Connect</span>
        </button>
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-2">
        <button
          onClick={toggleSnapToGrid}
          className={`toolbar-button flex items-center gap-2 ${
            ui.snapToGrid ? 'toolbar-button-active' : ''
          }`}
          title="Toggle snap to grid (G)"
        >
          <Grid3x3 size={16} />
          <span>Snap</span>
        </button>

        <button
          onClick={() => setConnectStyle(ui.connectStyle === 'smooth' ? 'orthogonal' : 'smooth')}
          className="toolbar-button flex items-center gap-2"
          title="Toggle connector style"
        >
          <Minus size={16} />
          <span>{ui.connectStyle === 'smooth' ? 'Smooth' : 'Orthogonal'}</span>
        </button>
      </div>
    </div>
  );
}

