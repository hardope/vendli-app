export function SkeletonProductCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white flex flex-col overflow-hidden">
      <div className="h-28 w-full bg-slate-100 animate-pulse" />
      <div className="flex-1 flex flex-col px-3 py-2 gap-2">
        <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
        <div className="flex gap-1 mt-1">
          <div className="h-4 w-12 bg-slate-100 rounded-full animate-pulse" />
        </div>
        <div className="mt-2 flex gap-1.5">
          <div className="h-6 flex-1 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-6 flex-1 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-6 w-6 bg-slate-100 rounded-full animate-pulse shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }) {
  const widths = ['55%', '80%', '65%', '45%', '30%', '50%'];
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-2.5">
          <div
            className="h-3 bg-slate-100 rounded animate-pulse"
            style={{ width: widths[i % widths.length] }}
          />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonReviewCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="mt-3 h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
      <div className="mt-2 h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
    </div>
  );
}
