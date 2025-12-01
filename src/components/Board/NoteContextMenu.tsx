// src/components/Board/NoteContextMenu.tsx
import Portal from "./Portal";
import { useBoardStore } from "../../app/store";

type Props = {
  isOpen: boolean;
  x: number;
  y: number;
  noteId: string | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
};

export default function NoteContextMenu({ isOpen, x, y, noteId, menuRef, onClose }: Props) {
  const openEditModal = useBoardStore((state) => state.openEditModal);
  const openDeleteConfirmation = useBoardStore((state) => state.openDeleteConfirmation);
  const notes = useBoardStore((state) => state.notes);

  if (!isOpen || !noteId) return null;

  const note = notes[noteId];
  if (!note) return null;

  const handleEdit = () => { 
    openEditModal(noteId); 
    onClose(); 
  };
  
  const handleDelete = () => { 
    openDeleteConfirmation(noteId, note.title, note.isOpen);
    onClose(); 
  };

  return (
    <Portal>
      <div
        ref={menuRef}
        style={{ top: y, left: x }}
        className="fixed z-[1000] min-w-40 rounded-xl border border-zinc-700 bg-zinc-900/95 shadow-xl backdrop-blur
                   ring-1 ring-black/20 overflow-hidden"
      >
        <button
          className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none"
          onClick={handleEdit}
        >
          Edit note
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm text-red-300 hover:bg-red-900/30 focus:bg-red-900/30 focus:outline-none"
          onClick={handleDelete}
        >
          Delete note
        </button>
      </div>
    </Portal>
  );
}
