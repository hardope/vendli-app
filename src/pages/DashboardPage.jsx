"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreDashboardSummary } from '../services/dashboard.service.js';

export default function DashboardPage() {
  const { currentStoreId } = useStoreStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
        console.log('Loading dashboard summary for storeId:', currentStoreId);
      if (!currentStoreId) {
        setSummary(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStoreDashboardSummary(currentStoreId);
        if (!cancelled) {
          setSummary(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError('We could not load your dashboard metrics.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [currentStoreId]);

  const series = summary?.revenueSeries || [];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Overview</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Store performance</h1>
          </div>
        </div>

        {!currentStoreId && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Pick or create a store first from the sidebar to see your dashboard.
          </div>
        )}

        {currentStoreId && (
          <>
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-2">
                <p className="text-xs font-medium text-slate-500">Products</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {loading || !summary ? '—' : summary.totalProducts}
                </p>
                <p className="text-xs text-slate-500">
                  {loading || !summary
                    ? 'Total products in this store.'
                    : `${summary.totalActiveProducts} active · ${summary.totalInactiveProducts} inactive`}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-2">
                <p className="text-xs font-medium text-slate-500">Completed orders (7 days)</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {loading || !summary ? '—' : summary.completedOrdersLast7Days}
                </p>
                <p className="text-xs text-slate-500">Paid or fulfilled orders in the last 7 days.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-2">
                <p className="text-xs font-medium text-slate-500">Revenue (7 days)</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {loading || !summary ? '—' : `₦${summary.revenueLast7Days.toFixed(2)}`}
                </p>
                <p className="text-xs text-slate-500">Gross order totals across the last 7 days.</p>
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Revenue graph</p>
                  <p className="text-sm text-slate-800">Last 7 days</p>
                </div>
              </div>
              <div className="h-40 flex items-end gap-2">
                {series.length === 0 && (
                  <p className="text-xs text-slate-500">No revenue yet in the last 7 days.</p>
                )}
                {series.length > 0 && (
                  <>
                    {(() => {
                      const max = Math.max(...series.map((d) => d.revenue), 1);
                      return series.map((point) => (
                        <div key={point.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                          <div className="w-full bg-amber-100 rounded-t-lg overflow-hidden flex items-end justify-center" style={{ height: '100%' }}>
                            <div
                              className="w-3 rounded-t-md bg-gradient-to-t from-amber-500 to-orange-400"
                              style={{ height: `${(point.revenue / max) * 100 || 0}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">
                            {new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      ));
                    })()}
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
