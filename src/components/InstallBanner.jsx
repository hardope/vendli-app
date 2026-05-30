export function InstallBanner({ ios, onInstall, onDismiss }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:left-64 flex items-center gap-3 px-4 py-3 bg-white border-t border-slate-200 shadow-[0_-4px_24px_rgba(15,23,42,0.08)]">
      <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
        <img src="/logo.png" alt="Vendli" className="h-6 w-6" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-900">Add Vendli to your home screen</p>
        {ios ? (
          <p className="text-[11px] text-slate-500">
            Tap <span className="font-medium text-slate-700">Share</span> then{' '}
            <span className="font-medium text-slate-700">Add to Home Screen</span>
          </p>
        ) : (
          <p className="text-[11px] text-slate-500">Get quick access from your phone</p>
        )}
      </div>

      {!ios && (
        <button
          type="button"
          onClick={onInstall}
          className="shrink-0 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
        >
          Install
        </button>
      )}

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3 h-3">
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
    </div>
  );
}
