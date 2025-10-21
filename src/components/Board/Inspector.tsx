// Inspector panel - shows details of selected notes/links

import { useBoardStore } from '../../app/store';
import { X, Trash2 } from 'lucide-react';

export default function Inspector() {
  const selectedNoteIds = useBoardStore((state) => state.ui.selectedNoteIds);
  const notes = useBoardStore((state) => state.notes);
  const selectedLinkIds = useBoardStore((state) => state.ui.selectedLinkIds);
  const links = useBoardStore((state) => state.links);
  const clearSelection = useBoardStore((state) => state.clearSelection);
  const deleteNote = useBoardStore((state) => state.deleteNote);
  const deleteLink = useBoardStore((state) => state.deleteLink);
  const updateNoteWindow = useBoardStore((state) => state.updateNoteWindow);

  if (selectedNoteIds.length === 0 && selectedLinkIds.length === 0) {
    return null;
  }

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
  };

  const handleDeleteLink = (id: string) => {
    deleteLink(id);
  };

  return (
    <div className="inspector-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Inspector</h3>
        <button onClick={clearSelection} className="p-1 hover:bg-muted rounded">
          <X size={14} />
        </button>
      </div>

      {selectedNoteIds.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase">
            Selected Notes ({selectedNoteIds.length})
          </h4>
          {selectedNoteIds.map((id) => {
            const note = notes[id];
            if (!note) return null;

            return (
              <div key={id} className="p-3 bg-muted rounded-lg space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Title</label>
                  <input
                    type="text"
                    value={note.title}
                    onChange={(e) => updateNoteWindow(id, { title: e.target.value })}
                    className="w-full mt-1 px-2 py-1 text-sm bg-background border border-border rounded focus-ring"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Position</label>
                  <div className="text-xs mt-1">
                    X: {Math.round(note.rect.x)}, Y: {Math.round(note.rect.y)}
                  </div>
                  <div className="text-xs">
                    W: {Math.round(note.rect.width)}, H: {Math.round(note.rect.height)}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteNote(id)}
                  className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-sm bg-red-600/10 hover:bg-red-600/20 text-red-600 rounded transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Delete Note</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedLinkIds.length > 0 && (
        <div className="space-y-3 mt-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase">
            Selected Links ({selectedLinkIds.length})
          </h4>
          {selectedLinkIds.map((id) => {
            const link = links[id];
            if (!link) return null;

            const sourceNote = notes[link.sourceId];
            const targetNote = notes[link.targetId];

            return (
              <div key={id} className="p-3 bg-muted rounded-lg space-y-2">
                <div className="text-xs">
                  <span className="text-muted-foreground">From:</span> {sourceNote?.title || 'Unknown'}
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">To:</span> {targetNote?.title || 'Unknown'}
                </div>

                <button
                  onClick={() => handleDeleteLink(id)}
                  className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-sm bg-red-600/10 hover:bg-red-600/20 text-red-600 rounded transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Delete Link</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

