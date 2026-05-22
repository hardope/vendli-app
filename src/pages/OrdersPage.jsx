"use client";

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreOrders } from '../services/order.service.js';
import { formatCurrency } from '../lib/format.js';

function StatusBadge({ status }) {
  const map = {
    PENDING: 'bg-slate-100 text-slate-600 border border-slate-200',
    PAID: 'bg-amber-50 text-amber-800 border border-amber-200',
    FULFILLED: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border border-rose-200',
    REFUNDED: 'bg-rose-50 text-rose-700 border border-rose-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${map[status] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
      {status}
    </span>
  );
}

function SectionCard({ children }) {
  return <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">{children}</div>;
}

function SectionHeader({ children }) {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
      {children}
    </div>
  );
}

const DEFAULT_PAGE_SIZE = 20;

export default function OrdersPage() {
  const { currentStoreId } = useStoreStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState({ items: [], total: 0 });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!currentStoreId) {
        setResult({ items: [], total: 0 });
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStoreOrders(currentStoreId, page, pageSize);
        if (!cancelled) setResult({ items: data.items || [], total: data.total || 0 });
      } catch {
        if (!cancelled) setError('We could not load your orders.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentStoreId, page, pageSize]);

  const items = result.items || [];
  const total = result.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setPage = (newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage <= 1) next.delete('page');
      else next.set('page', String(newPage));
      return next;
    }, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Sales</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Orders</h1>
        </div>

        {!currentStoreId && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm text-slate-600">
            Pick or create a store first from the sidebar to see orders.
          </div>
        )}

        {currentStoreId && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {currentStoreId && !error && (
          <SectionCard>
            <SectionHeader>
              <p className="text-sm font-semibold text-slate-900">All orders</p>
              {!loading && (
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  {total} total
                </span>
              )}
            </SectionHeader>

            {loading ? (
              <div className="divide-y divide-slate-100 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-36 bg-slate-100 rounded" />
                      <div className="h-3 w-48 bg-slate-100 rounded" />
                    </div>
                    <div className="h-4 w-16 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-slate-500">No orders yet</p>
                <p className="mt-1 text-xs text-slate-400">New sales will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((order) => {
                  const customer = order.customer || {};
                  const customerName = customer.name || customer.email || 'Guest';
                  const date = new Date(order.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  });
                  return (
                    <div
                      key={order.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/orders/${order.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/orders/${order.id}`); }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-semibold text-slate-900 font-mono">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {customerName} · {date}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 shrink-0">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-slate-300 shrink-0">
                        <path d="M6 3l5 5-5 5" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Previous
                </button>
                <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Next
                </button>
              </div>
            )}
          </SectionCard>
        )}
      </div>
    </DashboardLayout>
  );
}
