"use client";

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreCustomers } from '../services/customer.service.js';
import { formatCurrency } from '../lib/format.js';
import { SkeletonTableRow } from '../components/Skeleton.jsx';

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
        if (!cancelled) {
          setResult({ items: data.items || [], total: data.total || 0 });
        }
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
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Customers</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Store customers</h1>
            <p className="mt-1 text-[11px] text-slate-500">See who has ordered from this store and how much they have spent.</p>
          </div>
        </div>

        {!currentStoreId && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Pick or create a store first from the sidebar to see customers.
          </div>
        )}

        {currentStoreId && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-slate-500">Customers</p>
                <p className="text-sm text-slate-800">People who have ordered from this store</p>
              </div>
              {!loading && (
                <p className="text-[11px] text-slate-500">Showing {items.length} of {total} customers</p>
              )}
            </div>

            {error && !loading && (
              <p className="text-xs text-rose-600">{error}</p>
            )}

            {!error && (
              loading ? (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-[11px] text-slate-500">
                        <th className="px-3 py-2 font-medium">Customer</th>
                        <th className="px-3 py-2 font-medium">Email</th>
                        <th className="px-3 py-2 font-medium">Phone</th>
                        <th className="px-3 py-2 font-medium text-right">Orders</th>
                        <th className="px-3 py-2 font-medium text-right">Total spent</th>
                        <th className="px-3 py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/80">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonTableRow key={i} cols={6} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : items.length === 0 ? (
                <p className="text-xs text-slate-500">No customers yet. New buyers will appear here.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-[11px] text-slate-500">
                        <th className="px-3 py-2 font-medium">Customer</th>
                        <th className="px-3 py-2 font-medium">Email</th>
                        <th className="px-3 py-2 font-medium">Phone</th>
                        <th className="px-3 py-2 font-medium text-right">Orders</th>
                        <th className="px-3 py-2 font-medium text-right">Total spent</th>
                        <th className="px-3 py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/80">
                      {items.map((customer) => {
                        const name = customer.name || customer.email || 'Guest';
                        return (
                          <tr key={customer.id} className="text-[11px] text-slate-700">
                            <td className="px-3 py-2 max-w-xs truncate">{name}</td>
                            <td className="px-3 py-2 max-w-xs truncate">{customer.email || '—'}</td>
                            <td className="px-3 py-2 max-w-xs truncate">{customer.phone || '—'}</td>
                            <td className="px-3 py-2 text-right">{customer.totalOrders}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatCurrency(customer.totalSpent)}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => navigate(`/customers/${customer.id}`)}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <p>Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!hasPrev || loading}
                  onClick={() => setPage(page - 1)}
                  className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-300 hover:bg-slate-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!hasNext || loading}
                  onClick={() => setPage(page + 1)}
                  className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-300 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
