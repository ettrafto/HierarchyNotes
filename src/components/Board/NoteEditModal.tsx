// src/components/Board/NoteEditModal.tsx
import Portal from "./Portal";
import { useEffect, useRef, useState } from "react";
import { useBoardStore } from "../../app/store";
import type { NoteWindow } from "../../lib/types";

export default function NoteEditModal() {
  const modal = useBoardStore((state) => state.uiModalEditNote);
  const close = useBoardStore((state) => state.closeEditModal);
  const updateNote = useBoardStore((state) => state.updateNote);
  const note = useBoardStore((state) => (modal?.id ? state.notes[modal.id] : null));

  const [local, setLocal] = useState<Partial<NoteWindow>>({});
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (note) setLocal({ title: note.title, content: note.content, color: note.color });
  }, [note?.id]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [close]);

  if (!modal || !note) return null;

  const onBackdrop = (e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) close();
  };

  const onSave = () => {
    updateNote(note.id, local);
    close();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={onBackdrop}>
        <div
          ref={dialogRef}
          className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl p-4"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3 border-b border-zinc-700 pb-2">
            <h2 className="text-zinc-100 text-sm">Edit Note</h2>
            <button className="text-zinc-400 hover:text-zinc-200 text-sm" onClick={close}>✕</button>
          </div>

          <div className="space-y-3">
            <label className="block text-xs text-zinc-400">Title</label>
            <input
              className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 ring-zinc-600"
              value={local.title ?? ""}
              onChange={(e) => setLocal(s => ({ ...s, title: e.target.value }))}
            />

            <label className="block text-xs text-zinc-400">Color (optional)</label>
            <input
              className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 ring-zinc-600"
              value={local.color ?? ""}
              onChange={(e) => setLocal(s => ({ ...s, color: e.target.value }))}
              placeholder="#A3E635 or zinc-800"
            />

            <label className="block text-xs text-zinc-400">Content</label>
            <textarea
              className="w-full min-h-[120px] rounded-lg bg-zinc-800/80 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 ring-zinc-600"
              value={local.content ?? ""}
              onChange={(e) => setLocal(s => ({ ...s, content: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button className="px-3 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={close}>Cancel</button>
            <button className="px-3 py-2 text-sm rounded-lg bg-zinc-200 text-zinc-900 hover:bg-white" onClick={onSave}>Save</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
