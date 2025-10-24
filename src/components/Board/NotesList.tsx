import { useMemo, useState } from 'react';
import { useBoardStore } from '../../app/store';
import ConfirmDialog from './ConfirmDialog';
import { debug } from '../../lib/debug';

export default function NotesList() {
  const notes = useBoardStore((s) => s.notes);
  const toggleNoteWindow = useBoardStore((s) => s.toggleNoteWindow);
  const deleteNote = useBoardStore((s) => s.deleteNote);
  

  const [confirm, setConfirm] = useState<{ open: boolean; id?: string }>({ open: false });

  const items = useMemo(() => {
    const sorted = Object.values(notes).sort((a, b) => a.title.localeCompare(b.title));
    debug.log('RENDER', '[NotesList] Rendering items:', sorted.map(n => ({
      id: n.id,
      title: n.title,
      isOpen: n.isOpen,
      isActive: n.isActive,
    })));
    return sorted;
  }, [notes]);

  return (
    <div className="p-2 border-r border-zinc-800 w-72 shrink-0">
      <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Notes</div>

      <div className="flex flex-col gap-1">
        {items.map((n) => (
          <div
            key={n.id}
            className="flex items-center justify-between px-2 py-1 rounded hover:bg-zinc-800 cursor-pointer"
            title={n.isOpen ? 'Click to close' : 'Click to open'}
            onClick={async (e) => {
              // Avoid toggling when clicking on inline input
              if ((e.target as HTMLElement).tagName === 'INPUT') return;
              await toggleNoteWindow(n.id);
            }}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-2 h-2 rounded-full" style={{ background: n.color || '#94a3b8' }} />
              <span 
                className="truncate" 
                style={{ opacity: n.isActive === false ? 0.5 : 1 }}
              >
                {n.title || 'Untitled'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs" title={n.isOpen ? 'Open' : 'Closed'}>{n.isOpen ? '●' : '○'}</span>
              <button
                className="text-xs text-red-400 hover:text-red-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirm({ open: true, id: n.id });
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Delete note?"
        description="This will permanently remove the note. You can undo for a few seconds."
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => {
          if (confirm.id) await deleteNote(confirm.id);
          setConfirm({ open: false });
          // No undo in this pass
        }}
      />
    </div>
  );
}


