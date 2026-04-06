export default function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-500">Loading your workspace…</p>
      </div>
    </div>
  );
}
