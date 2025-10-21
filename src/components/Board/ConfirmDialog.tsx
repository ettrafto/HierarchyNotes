type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[9998] flex items-center justify-center bg-black/40">
      <div className="bg-zinc-900 text-white rounded shadow-lg p-4 w-[320px]">
        <div className="text-sm font-semibold mb-2">{title}</div>
        {description && <div className="text-xs text-zinc-300 mb-3">{description}</div>}
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 text-sm bg-zinc-700 rounded" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="px-3 py-1 text-sm bg-red-600 rounded" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


