import { useEffect } from 'react';
import { useToastStore } from '../store/toast.store.js';

function Toast({ id, type, message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const base =
    'pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 shadow-lg text-sm flex items-start gap-2 backdrop-blur-md';

  const variants = {
    success: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
    error: 'bg-rose-50/90 border-rose-200 text-rose-900',
    info: 'bg-slate-50/90 border-slate-200 text-slate-900',
  };

  return (
    <div className={`${base} ${variants[type] ?? variants.info}`}>
      <div className="mt-0.5 h-2 w-2 rounded-full bg-slate-400" />
      <div className="flex-1 text-xs leading-snug">{message}</div>
      <button
        type="button"
        onClick={() => onClose(id)}
        className="ml-2 text-[10px] uppercase tracking-wide text-slate-400 hover:text-slate-600"
      >
        Close
      </button>
    </div>
  );
}

export default function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center sm:justify-end px-4">
      <div className="flex flex-col gap-2 max-w-sm w-full sm:mr-4">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
}
