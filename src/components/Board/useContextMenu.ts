// src/components/Board/useContextMenu.ts
import { useEffect, useRef, useState } from "react";

export function useContextMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [noteId, setNoteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const open = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
    setNoteId(id);
    setIsOpen(true);
  };
  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isOpen]);

  return { isOpen, pos, noteId, open, close, menuRef };
}
