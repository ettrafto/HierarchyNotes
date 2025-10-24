// Topbar component - main navigation and controls

import { Plus, Search, Moon, Sun, RotateCcw, Save } from 'lucide-react';
import { useBoardStore } from '../../app/store';
import { useState } from 'react';
import { toggleTheme, getTheme } from '../../app/theme';
import { saveBoardState } from '../../app/persistence';
import { debug } from '../../lib/debug';

interface TopbarProps {
  onResetLayout: () => void;
}

export default function Topbar({ onResetLayout }: TopbarProps) {
  const createNote = useBoardStore((state) => state.createNote);
  const [theme, setThemeState] = useState(getTheme());

  const handleNewNote = () => {
    createNote();
  };

  const handleToggleTheme = () => {
    const newTheme = toggleTheme();
    setThemeState(newTheme);
  };

  const handleSearch = () => {
    // TODO: Implement search functionality
    debug.log('EVENTS', '[Topbar] Search not yet implemented');
  };

  return (
    <div className="toolbar glass-effect">
      <div className="flex items-center gap-3 flex-1">
        <h1 className="text-lg font-semibold">HierarchyNotes</h1>
        
        <button
          onClick={handleNewNote}
          className="toolbar-button flex items-center gap-2"
          title="Create new note (N)"
        >
          <Plus size={16} />
          <span>New Note</span>
        </button>

        <button
          onClick={handleSearch}
          className="toolbar-button flex items-center gap-2"
          title="Search (⌘K)"
        >
          <Search size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => saveBoardState(useBoardStore.getState())}
          className="toolbar-button flex items-center gap-2"
          title="Save Now"
        >
          <Save size={16} />
          <span>Save Now</span>
        </button>

        <button
          onClick={onResetLayout}
          className="toolbar-button flex items-center gap-2"
          title="Reset to sample layout"
        >
          <RotateCcw size={16} />
          <span>Reset</span>
        </button>

        <button
          onClick={handleToggleTheme}
          className="toolbar-button"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
}

