// Custom title bar component for the main window

import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export default function CustomTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial maximized state
    getCurrentWindow().isMaximized().then(setIsMaximized);
  }, []);

  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      const window = getCurrentWindow();
      if (isMaximized) {
        await window.unmaximize();
      } else {
        await window.maximize();
      }
      setIsMaximized(!isMaximized);
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  return (
    <div className="titlebar">
      {/* App Icon */}
      <div className="titlebar-icon">
        <div className="w-4 h-4 bg-zinc-600 rounded-sm flex items-center justify-center">
          <div className="w-2 h-2 bg-zinc-300 rounded-sm"></div>
        </div>
      </div>

      {/* Window Title */}
      <div className="titlebar-title">HierarchyNotes - Board</div>

      {/* Window Controls */}
      <div className="titlebar-controls">
        <button
          className="titlebar-control-button minimize"
          onClick={handleMinimize}
          title="Minimize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="1" y="4.5" width="8" height="1" />
          </svg>
        </button>
        <button
          className="titlebar-control-button maximize"
          onClick={handleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            {isMaximized ? (
              <path d="M2 2h6v6H2V2zm1 1v4h4V3H3z" />
            ) : (
              <path d="M1 1h8v8H1V1zm1 1v6h6V2H2z" />
            )}
          </svg>
        </button>
        <button
          className="titlebar-control-button close"
          onClick={handleClose}
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
      </div>
    </div>
  );
}
