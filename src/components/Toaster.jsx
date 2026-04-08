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
    'pointer-events-auto w-full max-w-sm rounded-xl border px-3.5 py-3 shadow-lg text-xs flex items-start gap-2 bg-white/90 backdrop-blur-md';

  const variants = {
    success: 'border-emerald-200 text-emerald-900',
    error: 'border-rose-200 text-rose-900',
    info: 'border-slate-200 text-slate-900',
  };

  return (
    <div className={`${base} ${variants[type] ?? variants.info}`}>
      <div className="mt-0.5 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0" />
      <div className="flex-1 text-[11px] leading-snug">{message}</div>
      <button
        type="button"
        onClick={() => onClose(id)}
        className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100/70 transition-colors"
        aria-label="Close toast"
      >
        <span className="text-[11px] leading-none">×</span>
      </button>
    </div>
  );
}

export default function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center sm:justify-end px-4">
      <div className="flex flex-col gap-2 max-w-sm w-full sm:mr-4">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
}
