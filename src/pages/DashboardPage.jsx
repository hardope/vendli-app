"use client";

import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreDashboardSummary } from '../services/dashboard.service.js';
import { useWalletStore } from '../store/wallet.store.js';
import { formatCurrency } from '../lib/format.js';

function RevenueChart({ series }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || series.length === 0) return;

    const loadChart = () => {
      if (!window.Chart) return;

      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      const labels = series.map((point) =>
        new Date(point.date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })
      );
      const data = series.map((point) => point.revenue);

      chartRef.current = new window.Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Revenue',
              data,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              borderWidth: 2,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#f59e0b',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: '#f59e0b',
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#ffffff',
              titleColor: '#64748b',
              bodyColor: '#0f172a',
              borderColor: '#e2e8f0',
              borderWidth: 1,
              padding: 10,
              titleFont: { size: 11, weight: '500' },
              bodyFont: { size: 13, weight: '600' },
              callbacks: {
                label: (ctx) => `  ${formatCurrency(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                color: '#94a3b8',
                font: { size: 11 },
                autoSkip: false,
                maxRotation: 0,
              },
            },
            y: {
              position: 'right',
              grid: {
                color: '#f1f5f9',
                drawBorder: false,
              },
              border: { display: false, dash: [4, 4] },
              ticks: {
                color: '#94a3b8',
                font: { size: 11 },
                maxTicksLimit: 4,
                callback: (v) => formatCurrency(v),
              },
            },
          },
        },
      });
    };

    if (window.Chart) {
      loadChart();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      script.onload = loadChart;
      document.head.appendChild(script);
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [series]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '180px' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Line chart showing revenue over the last 7 days"
      />
    </div>
  );
}

export default function DashboardPage() {
  const { currentStoreId } = useStoreStore();
  const setWalletBalance = useWalletStore((s) => s.setBalance);
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
          setWalletBalance(data.walletBalance ?? 0);
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

  const rawSeries = summary?.revenueSeries || [];
  const series = rawSeries.map((point) => ({
    date: point.date,
    revenue: typeof point.revenue === 'number' ? point.revenue : Number(point.revenue) || 0,
  }));

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

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-1.5">
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
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-1.5">
                <p className="text-xs font-medium text-slate-500">Completed orders (7 days)</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {loading || !summary ? '—' : summary.completedOrdersLast7Days}
                </p>
                <p className="text-xs text-slate-500">Orders you have marked as fulfilled in the last 7 days.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-1.5">
                <p className="text-xs font-medium text-slate-500">Pending fulfilment (7 days)</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {loading || !summary ? '—' : (summary.pendingOrdersLast7Days ?? 0)}
                </p>
                <p className="text-xs text-slate-500">Paid orders that are waiting to be fulfilled.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-1.5">
                <p className="text-xs font-medium text-slate-500">Revenue (7 days)</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {loading || !summary ? '—' : formatCurrency(summary.revenueLast7Days)}
                </p>
                <p className="text-xs text-slate-500">Gross order totals across the last 7 days.</p>
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-medium text-slate-500">Revenue graph</p>
                  <p className="text-sm text-slate-800">Last 7 days</p>
                </div>
              </div>
              {series.length === 0 && (
                <p className="text-xs text-slate-500">No revenue yet in the last 7 days.</p>
              )}
              {series.length > 0 && <RevenueChart series={series} />}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}