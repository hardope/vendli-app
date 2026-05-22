"use client";

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreCustomer } from '../services/customer.service.js';
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

function SectionCard({ children, className = '' }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white overflow-hidden ${className}`}>{children}</div>;
}

function SectionHeader({ children }) {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
      {children}
    </div>
  );
}

export default function CustomerDetailPage() {
  const { currentStoreId } = useStoreStore();
  const navigate = useNavigate();
  const { customerId } = useParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!currentStoreId || !customerId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStoreCustomer(currentStoreId, customerId);
        if (!cancelled) setCustomer(data);
      } catch {
        if (!cancelled) setError('We could not load this customer.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentStoreId, customerId]);

  const name = customer?.name || customer?.email || 'Customer';

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Customer</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {loading ? <span className="inline-block h-7 w-48 bg-slate-100 rounded-lg animate-pulse" /> : name}
          </h1>
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

        {currentStoreId && loading && (
          <div className="grid gap-4 sm:grid-cols-2 animate-pulse">
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
              <div className="h-7 w-28 bg-slate-100 rounded" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
              <div className="h-7 w-28 bg-slate-100 rounded" />
            </div>
          </div>
        )}

        {currentStoreId && !loading && !error && customer && (
          <>
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Total orders', value: customer.totalOrders ?? 0, color: 'text-slate-900' },
                { label: 'Total spent', value: formatCurrency(customer.totalSpent), color: 'text-slate-900' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                  <p className={`text-2xl font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Contact */}
            <SectionCard>
              <SectionHeader>
                <p className="text-sm font-semibold text-slate-900">Contact details</p>
              </SectionHeader>
              <div className="px-5 py-5 grid sm:grid-cols-3 gap-5">
                {[
                  { label: 'Name', value: customer.name || '—' },
                  { label: 'Email', value: customer.email || '—' },
                  { label: 'Phone', value: customer.phone || '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-sm text-slate-900 break-all">{value}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Orders */}
            <SectionCard>
              <SectionHeader>
                <p className="text-sm font-semibold text-slate-900">Order history</p>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  {customer.orders?.length || 0} order{customer.orders?.length !== 1 ? 's' : ''}
                </span>
              </SectionHeader>

              {!customer.orders || customer.orders.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-slate-500">No orders from this customer yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {customer.orders.map((order) => {
                    const date = order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—';
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
                          <p className="text-[11px] text-slate-500">{date}</p>
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
            </SectionCard>
          </>
        )}

        {currentStoreId && !loading && !error && !customer && (
          <p className="text-sm text-slate-500">Customer not found.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
