// src/components/Board/DeleteConfirmationModal.tsx
import Portal from "./Portal";
import { useEffect, useRef } from "react";
import { useBoardStore } from "../../app/store";

export default function DeleteConfirmationModal() {
  const deleteConfirmation = useBoardStore((state) => state.uiDeleteConfirmation);
  const closeDeleteConfirmation = useBoardStore((state) => state.closeDeleteConfirmation);
  const confirmDelete = useBoardStore((state) => state.confirmDelete);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && closeDeleteConfirmation();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [closeDeleteConfirmation]);

  if (!deleteConfirmation) return null;

  const onBackdrop = (e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) closeDeleteConfirmation();
  };

  const handleConfirm = () => {
    confirmDelete(deleteConfirmation.noteId);
    closeDeleteConfirmation();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={onBackdrop}>
        <div
          ref={dialogRef}
          className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl p-6"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-zinc-100 text-lg font-semibold">Delete Note</h2>
            <button className="text-zinc-400 hover:text-zinc-200 text-lg" onClick={closeDeleteConfirmation}>✕</button>
          </div>

          <div className="space-y-4">
            <p className="text-zinc-300 text-sm">
              Are you sure you want to delete "{deleteConfirmation.noteTitle}"? This action cannot be undone.
            </p>
            
            {deleteConfirmation.noteIsOpen && (
              <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                <p className="text-yellow-200 text-xs">
                  ⚠️ This note has an open window that will also be closed.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button 
              className="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors" 
              onClick={closeDeleteConfirmation}
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors" 
              onClick={handleConfirm}
            >
              Delete Note
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
