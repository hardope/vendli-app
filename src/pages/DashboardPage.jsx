"use client";

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreDashboardSummary, fetchRevenueSeriesByDays } from '../services/dashboard.service.js';
import { useWalletStore } from '../store/wallet.store.js';
import { formatCurrency } from '../lib/format.js';

const CHART_RANGES = [
  { label: '7d', days: 7 },
  { label: '21d', days: 21 },
  { label: '30d', days: 30 },
  { label: '3m', days: 90 },
];

function StarsInline({ value }) {
  const clamped = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  const filledCount = Math.round(clamped);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= filledCount ? 'text-slate-900' : 'text-slate-300'}>★</span>
      ))}
    </span>
  );
}

function RangeToggle({ options, active, onChange, loading }) {
  return (
    <div className="flex items-center gap-2">
      {loading && <span className="text-[10px] text-slate-400 animate-pulse">updating…</span>}
      <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
        {options.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-0.5 rounded-full transition-colors whitespace-nowrap ${
              active === opt.days
                ? 'bg-white text-slate-900 shadow-sm font-medium'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RevenueChart({ series, days }) {
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

      const labels = series.map((point) => {
        const date = new Date(point.date);
        if (days > 30) return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      });

      const revenueData = series.map((point) => point.revenue ?? 0);
      const viewsData = series.map((point) => point.views ?? 0);

      const maxTicksLimit = days > 30 ? 8 : series.length;

      chartRef.current = new window.Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Revenue',
              data: revenueData,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              borderWidth: 2,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#f59e0b',
              pointBorderWidth: 2,
              pointRadius: series.length > 30 ? 0 : 4,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: '#f59e0b',
              tension: 0.4,
              fill: true,
              yAxisID: 'y',
            },
            {
              label: 'Store views',
              data: viewsData,
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99, 102, 241, 0.06)',
              borderWidth: 2,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#6366f1',
              pointBorderWidth: 2,
              pointRadius: series.length > 30 ? 0 : 3,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: '#6366f1',
              tension: 0.4,
              fill: true,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: true,
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                padding: 14,
                color: '#64748b',
                font: { size: 11 },
              },
            },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#94a3b8',
              bodyColor: '#f1f5f9',
              borderColor: '#334155',
              borderWidth: 1,
              padding: 12,
              cornerRadius: 10,
              titleFont: { size: 11, weight: '500' },
              bodyFont: { size: 13, weight: '600' },
              callbacks: {
                label: (ctx) => {
                  if (ctx.dataset.label === 'Revenue') return `  Revenue: ${formatCurrency(ctx.parsed.y)}`;
                  return `  Views: ${ctx.parsed.y.toLocaleString()}`;
                },
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
                autoSkip: true,
                maxTicksLimit,
                maxRotation: 0,
              },
            },
            y: {
              position: 'right',
              grid: { color: '#f1f5f9' },
              border: { display: false, dash: [4, 4] },
              ticks: {
                color: '#94a3b8',
                font: { size: 11 },
                maxTicksLimit: 4,
                callback: (v) => formatCurrency(v),
              },
            },
            y1: {
              position: 'left',
              grid: { drawOnChartArea: false },
              border: { display: false },
              ticks: {
                color: '#94a3b8',
                font: { size: 11 },
                maxTicksLimit: 4,
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
  }, [series, days]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '200px' }}>
      <canvas ref={canvasRef} role="img" aria-label="Revenue and store views chart" />
    </div>
  );
}

export default function DashboardPage() {
  const { currentStoreId } = useStoreStore();
  const setWalletBalance = useWalletStore((s) => s.setBalance);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [chartSeries, setChartSeries] = useState([]);
  const [chartRange, setChartRange] = useState(7);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!currentStoreId) {
        setSummary(null);
        setChartSeries([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStoreDashboardSummary(currentStoreId);
        if (!cancelled) {
          setSummary(data);
          setWalletBalance(data.walletBalance ?? 0);
          const raw = data.revenueSeries ?? [];
          setChartSeries(raw.map((p) => ({
            date: p.date,
            revenue: typeof p.revenue === 'number' ? p.revenue : Number(p.revenue) || 0,
            views: typeof p.views === 'number' ? p.views : Number(p.views) || 0,
          })));
        }
      } catch {
        if (!cancelled) setError('We could not load your dashboard metrics.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentStoreId]);

  const handleChartRangeChange = async (opt) => {
    if (opt.days === chartRange || !currentStoreId) return;
    setChartRange(opt.days);
    try {
      setChartLoading(true);
      const raw = await fetchRevenueSeriesByDays(currentStoreId, opt.days);
      setChartSeries((raw ?? []).map((p) => ({
        date: p.date,
        revenue: typeof p.revenue === 'number' ? p.revenue : Number(p.revenue) || 0,
        views: typeof p.views === 'number' ? p.views : Number(p.views) || 0,
      })));
    } catch {
      // silent — keep existing series
    } finally {
      setChartLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Overview</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Store performance</h1>
          </div>

          {currentStoreId && !loading && summary && (
            <Link
              to="/reviews"
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              <StarsInline value={Number(summary?.averageRating) || 0} />
              <span className="font-medium">
                {(summary.ratingCount ?? 0) > 0 ? (Number(summary.averageRating) || 0).toFixed(1) : 'No ratings yet'}
              </span>
              <span className="text-slate-500">{`(${summary.ratingCount ?? 0})`}</span>
              <span className="text-slate-400">•</span>
              <span className="font-medium">View</span>
            </Link>
          )}
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

            <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Revenue graph</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Sales and store views over time</p>
                </div>
                <RangeToggle
                  options={CHART_RANGES}
                  active={chartRange}
                  onChange={handleChartRangeChange}
                  loading={chartLoading}
                />
              </div>
              <div className="p-5">
                {chartSeries.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No data for this period.</p>
                ) : (
                  <RevenueChart series={chartSeries} days={chartRange} />
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
