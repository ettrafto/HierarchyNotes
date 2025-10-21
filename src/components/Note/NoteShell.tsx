// NoteShell component - UI for individual note windows

import { useState, useEffect, useRef } from 'react';
import { emitNoteContentChanged } from '../../app/ipc';
import { debounce } from '../../lib/utils';
import type { NoteHydrateEvent } from '../../lib/types';

interface NoteShellProps {
  noteData: NoteHydrateEvent | null;
}

export default function NoteShell({ noteData }: NoteShellProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (noteData) {
      setTitle(noteData.title);
      setContent(noteData.content);
    }
  }, [noteData]);

  // Debounced emit for content changes
  const debouncedEmit = useRef(
    debounce((id: string, newTitle: string, newContent: string) => {
      emitNoteContentChanged({ id, title: newTitle, content: newContent });
    }, 500)
  ).current;

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (noteData) {
      debouncedEmit(noteData.id, newTitle, content);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (noteData) {
      debouncedEmit(noteData.id, title, newContent);
    }
  };

  if (!noteData) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  const accentColor = noteData.color || '#64748b';

  return (
    <div
      className={`note-window w-full h-full ${isFocused ? 'note-window-focused' : ''}`}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {/* Title bar */}
      <div
        className="note-title-bar"
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: accentColor,
        }}
      >
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
          placeholder="Untitled Note"
        />
      </div>

      {/* Content area */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        className="note-content"
        placeholder="Type your note content here..."
        spellCheck={false}
      />
    </div>
  );
}

