import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
};

export default function InlineEdit({ value, onCommit, placeholder }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = () => {
    const next = draft.trim() || value;
    if (next !== value) onCommit(next);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        className="cursor-text hover:underline underline-offset-2"
        title="Click to rename"
        onClick={() => setEditing(true)}
      >
        {value || placeholder || 'Untitled'}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      className="bg-transparent border-b border-zinc-500 outline-none px-0.5"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') cancel();
      }}
      placeholder={placeholder || 'Untitled'}
    />
  );
}


