"use client";

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreCustomers } from '../services/customer.service.js';
import { formatCurrency } from '../lib/format.js';

export default function CustomersPage() {
  const { currentStoreId } = useStoreStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
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
      } catch (err) {
        if (!cancelled) {
          setError('We could not load your customers.');
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
  }, [currentStoreId, page, pageSize]);

  const items = result.items || [];
  const total = result.total || 0;
  const hasPrev = page > 1;
  const hasNext = page * pageSize < total;

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
              <p className="text-[11px] text-slate-500">Showing {items.length} of {total} customers</p>
            </div>

            {loading && <p className="text-xs text-slate-500">Loading customers…</p>}
            {error && !loading && (
              <p className="text-xs text-rose-600">{error}</p>
            )}

            {!loading && !error && items.length === 0 && (
              <p className="text-xs text-slate-500">No customers yet. New buyers will appear here.</p>
            )}

            {!loading && !error && items.length > 0 && (
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
            )}

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <p>
                Page {page} of {Math.max(1, Math.ceil(total / pageSize) || 1)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!hasPrev || loading}
                  onClick={() => hasPrev && setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-300 hover:bg-slate-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!hasNext || loading}
                  onClick={() => hasNext && setPage((p) => p + 1)}
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
