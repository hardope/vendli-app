"use client";

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreCustomers } from '../services/customer.service.js';
import { formatCurrency } from '../lib/format.js';

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

function CustomerAvatar({ name }) {
  const letter = (name || '?')[0].toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-slate-500">{letter}</span>
    </div>
  );
}

const DEFAULT_PAGE_SIZE = 20;

export default function CustomersPage() {
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
        const data = await fetchStoreCustomers(currentStoreId, page, pageSize);
        if (!cancelled) setResult({ items: data.items || [], total: data.total || 0 });
      } catch {
        if (!cancelled) setError('We could not load your customers.');
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
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Audience</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Customers</h1>
        </div>

        {!currentStoreId && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm text-slate-600">
            Pick or create a store first from the sidebar to see customers.
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
              <p className="text-sm font-semibold text-slate-900">All customers</p>
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
                    <div className="h-9 w-9 rounded-full bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-slate-100 rounded" />
                      <div className="h-3 w-44 bg-slate-100 rounded" />
                    </div>
                    <div className="text-right space-y-2">
                      <div className="h-3 w-20 bg-slate-100 rounded ml-auto" />
                      <div className="h-3 w-12 bg-slate-100 rounded ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-slate-500">No customers yet</p>
                <p className="mt-1 text-xs text-slate-400">Buyers will appear here after their first order.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((customer) => {
                  const name = customer.name || customer.email || 'Guest';
                  const subtitle = customer.name && customer.email ? customer.email : customer.phone || null;
                  return (
                    <div
                      key={customer.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/customers/${customer.id}`); }}
                    >
                      <CustomerAvatar name={name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{name}</p>
                        {subtitle && (
                          <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-slate-900">{formatCurrency(customer.totalSpent)}</p>
                        <p className="text-[11px] text-slate-500">{customer.totalOrders} order{customer.totalOrders !== 1 ? 's' : ''}</p>
                      </div>
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
