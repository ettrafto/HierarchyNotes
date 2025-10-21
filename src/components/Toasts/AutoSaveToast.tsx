import { useEffect, useState } from 'react';

type Props = {
  status: 'idle' | 'ok' | 'fail';
  message?: string;
  onHide?: () => void;
};

export default function AutoSaveToast({ status, message, onHide }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === 'ok' || status === 'fail') {
      setVisible(true);
      const t = window.setTimeout(() => {
        setVisible(false);
        onHide && onHide();
      }, 1500);
      return () => window.clearTimeout(t);
    }
  }, [status, onHide]);

  if (!visible) return null;

  const isError = status === 'fail';
  const text = isError ? (message || 'Save failed — retry') : 'Saved';

  return (
    <div className="pointer-events-none absolute top-3 right-3 z-[9999]">
      <div
        className={`px-3 py-2 rounded text-sm shadow ${
          isError ? 'bg-red-600 text-white' : 'bg-zinc-800 text-white'
        }`}
      >
        {text}
      </div>
    </div>
  );
}


