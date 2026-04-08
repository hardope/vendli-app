"use client";

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreCustomer } from '../services/customer.service.js';
import { formatCurrency } from '../lib/format.js';

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
        if (!cancelled) {
          setCustomer(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError('We could not load this customer.');
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
  }, [currentStoreId, customerId]);

  const showEmptyState = !currentStoreId || (!loading && !error && !customer);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="mb-1 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            >
              <span className="text-xs">←</span>
              Back to customers
            </button>
            <p className="text-xs text-slate-500">Customer</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {customer?.name || customer?.email || 'Customer'}
            </h1>
            <p className="mt-1 text-[11px] text-slate-500">Customer profile and orders for this store.</p>
          </div>
        </div>

        {!currentStoreId && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Pick or create a store first from the sidebar to see customers.
          </div>
        )}

        {currentStoreId && loading && (
          <p className="text-xs text-slate-500">Loading customer…</p>
        )}

        {currentStoreId && error && !loading && (
          <p className="text-xs text-rose-600">{error}</p>
        )}

        {currentStoreId && showEmptyState && !loading && !error && (
          <p className="text-xs text-slate-500">Customer not found.</p>
        )}

        {currentStoreId && customer && !loading && !error && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer details</h2>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[11px] text-slate-700 sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Name</dt>
                  <dd className="font-medium text-slate-900">{customer.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd>{customer.email || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Phone</dt>
                  <dd>{customer.phone || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Total orders for this store</dt>
                  <dd className="font-semibold text-slate-900">{customer.totalOrders}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Total spent for this store</dt>
                  <dd className="font-semibold text-slate-900">{formatCurrency(customer.totalSpent)}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Orders</h2>
                  <p className="text-[11px] text-slate-500">All orders this customer has placed for this store.</p>
                </div>
                <p className="text-[11px] text-slate-500">{customer.orders?.length || 0} orders</p>
              </div>

              {(!customer.orders || customer.orders.length === 0) && (
                <p className="text-xs text-slate-500">No orders yet from this customer.</p>
              )}

              {customer.orders && customer.orders.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-[11px] text-slate-500">
                        <th className="px-3 py-2 font-medium">Order</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Placed</th>
                        <th className="px-3 py-2 font-medium text-right">Total</th>
                        <th className="px-3 py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/80">
                      {customer.orders.map((order) => (
                        <tr key={order.id} className="text-[11px] text-slate-700">
                          <td className="px-3 py-2">#{order.id.slice(0, 8)}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] capitalize text-slate-700">
                              {order.status.toLowerCase()}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => navigate(`/orders/${order.id}`)}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            >
                              View order
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
