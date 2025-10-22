// Topbar component - main navigation and controls

import { Plus, Search, Moon, Sun, RotateCcw, Save, ChevronDown } from 'lucide-react';
import { useBoardStore } from '../../app/store';
import { useMemo, useState } from 'react';
import { toggleTheme, getTheme } from '../../app/theme';
import { saveBoardState } from '../../app/persistence';

interface TopbarProps {
  onResetLayout: () => void;
}

export default function Topbar({ onResetLayout }: TopbarProps) {
  const createNote = useBoardStore((state) => state.createNote);
  const [theme, setThemeState] = useState(getTheme());
  const externals = useBoardStore((s) => s.externals || {});
  const toggleGroup = useBoardStore((s: any) => (s as any).toggleExternalGroupVisibility);
  const [menuOpen, setMenuOpen] = useState(false);
  const activePrograms = useMemo(() => {
    const map = new Map<string, { exe: string; count: number; hiddenCount: number }>();
    Object.values(externals).forEach((e: any) => {
      const exe = (e.exe || '').split('\\').pop() || (e.title || '');
      const key = exe.toLowerCase();
      if (!map.has(key)) map.set(key, { exe, count: 0, hiddenCount: 0 });
      const v = map.get(key)!;
      v.count += 1;
      if (e.hidden) v.hiddenCount += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.exe.localeCompare(b.exe));
  }, [externals]);

  const handleNewNote = () => {
    createNote();
  };

  const handleToggleTheme = () => {
    const newTheme = toggleTheme();
    setThemeState(newTheme);
  };

  const handleSearch = () => {
    // TODO: Implement search functionality
    console.log('Search not yet implemented');
  };

  return (
    <div className="toolbar glass-effect relative z-40">
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
        {/* External programs visibility menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="toolbar-button flex items-center gap-2"
            title="Toggle external programs visibility"
          >
            <span>Programs</span>
            <ChevronDown size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-md border border-white/10 bg-neutral-900 shadow-lg z-50" onMouseLeave={() => setMenuOpen(false)}>
              <div className="max-h-80 overflow-auto py-1">
                {activePrograms.length === 0 && (
                  <div className="px-3 py-2 text-sm opacity-70">No active programs detected</div>
                )}
                {activePrograms.map((p) => {
                  const isAllHidden = p.hiddenCount === p.count;
                  return (
                    <label key={p.exe} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer text-sm select-none">
                      <input
                        type="checkbox"
                        checked={!isAllHidden}
                        onChange={(e) => toggleGroup(p.exe, e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="flex-1 truncate" title={p.exe}>{p.exe}</span>
                      <span className="opacity-60 text-xs">{p.count}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

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

