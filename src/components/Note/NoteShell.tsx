// NoteShell component - UI for individual note windows with custom chrome

import { useState, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { emitNoteContentChanged, closeNoteWindow, emitNoteFocused } from '../../app/ipc';
import { useBoardStore } from '../../app/store';
import { debounce } from '../../lib/utils';
import { getFrameClasses, getTitlebarClasses, getGripClasses, getContentClasses, getCloseButtonClasses } from '../../lib/windowThemes';
import type { NoteHydrateEvent } from '../../lib/types';

interface NoteShellProps {
  noteData: NoteHydrateEvent | null;
}

export default function NoteShell({ noteData }: NoteShellProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get the window style from the store
  const windowStyle = useBoardStore((state) => state.ui.windows.style);

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

  const handleClose = async () => {
    if (noteData) {
      console.log('[NoteShell] 🔴 handleClose called for:', noteData.id);
      try {
        console.log('[NoteShell] Calling closeNoteWindow IPC...');
        await closeNoteWindow({ id: noteData.id });
        console.log('[NoteShell] closeNoteWindow IPC completed');
      } catch (error) {
        console.error('[NoteShell] Failed to close note window:', error);
      }
    } else {
      console.warn('[NoteShell] handleClose called but no noteData!');
    }
  };

  const handleTitlebarMouseDown = (e: React.MouseEvent) => {
    console.log('[NoteShell] Titlebar mousedown - target:', e.target, 'currentTarget:', e.currentTarget);
    
    // Emit focus event to bring window to front on Board
    if (noteData) {
      console.log('[NoteShell] Emitting focus event for:', noteData.id);
      emitNoteFocused({ id: noteData.id });
    }
    // Don't prevent default - let Tauri handle the drag
  };

  if (!noteData) {
    return (
      <div className="w-full h-full flex items-center justify-center text-neutral-400 bg-neutral-900">
        Loading...
      </div>
    );
  }

  const accentColor = noteData.color || '#64748b';

  return (
    <div
      className={[
        'absolute inset-0 select-none flex flex-col',
        'rounded-clip-16 isolate', // Ensure perfect corner clipping
        getFrameClasses(windowStyle),
        isFocused ? 'ring-1 ring-white/20' : '',
      ].join(' ')}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{ borderRadius: '16px' }} // Explicit radius for sublayers
    >
      {/* Custom Titlebar (drag handle area) */}
      <div
        data-tauri-drag-region
        className={[
          getTitlebarClasses(windowStyle),
          'justify-between border-b border-white/5 cursor-move',
        ].join(' ')}
        onMouseDown={handleTitlebarMouseDown}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Grip handle */}
          <div 
            className={getGripClasses(windowStyle)}
            onClick={() => console.log('[NoteShell] Grip clicked')}
          />
          
          {/* Accent indicator */}
          <div
            className="w-1 h-4 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          
          {/* Title input - explicitly NO drag region */}
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium truncate cursor-text no-drag"
            placeholder="Untitled Note"
            onFocus={() => console.log('[NoteShell] Input focused')}
          />
        </div>

        {/* Controls: Close only - explicitly NO drag region */}
        <div className="flex items-center gap-1 no-drag">
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              console.log('[NoteShell] Close button clicked');
              handleClose();
            }}
            className={[getCloseButtonClasses(windowStyle), 'no-drag'].join(' ')}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className="opacity-80" style={{ pointerEvents: 'none' }}>
              <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className={[getContentClasses(windowStyle), 'relative overflow-hidden'].join(' ')}>
        <div className="w-full h-full">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full h-full p-4 resize-none border-none outline-none bg-transparent text-neutral-100"
            placeholder="Type your note content here..."
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
