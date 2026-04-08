"use client";

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreOrder, updateStoreOrderStatus } from '../services/order.service.js';
import { formatCurrency } from '../lib/format.js';

function StatusBadge({ status }) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide';
  const map = {
    PENDING: 'bg-slate-100 text-slate-700 border border-slate-200',
    PAID: 'bg-amber-50 text-amber-800 border border-amber-200',
    FULFILLED: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    CANCELLED: 'bg-rose-50 text-rose-800 border border-rose-200',
    REFUNDED: 'bg-rose-50 text-rose-800 border border-rose-200',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-700 border border-slate-200';
  return <span className={`${base} ${cls}`}>{status}</span>;
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { currentStoreId } = useStoreStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!currentStoreId || !orderId) {
        setOrder(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStoreOrder(currentStoreId, orderId);
        if (!cancelled) {
          setOrder(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError('We could not load this order.');
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
  }, [currentStoreId, orderId]);

  const latestPayment = useMemo(() => {
    if (!order || !order.payments || order.payments.length === 0) return null;
    return order.payments[0];
  }, [order]);

  const delivery = order?.deliveryDetails || {};
  const customer = order?.customer || {};

  const canFulfil = order && order.status === 'PAID';
  const canCancel = order && (order.status === 'PAID' || order.status === 'PENDING');

  const handleStatusChange = async (next) => {
    if (!currentStoreId || !orderId) return;
    if (next === 'FULFILLED') {
      const ok = window.confirm('Mark this order as fulfilled? This means you have completed the order for this customer.');
      if (!ok) return;
    }
    if (next === 'CANCELLED') {
      const ok = window.confirm('Cancel this order? This will mark the order as cancelled for the customer.');
      if (!ok) return;
    }
    setSaving(true);
    try {
      const updated = await updateStoreOrderStatus(currentStoreId, orderId, next);
      setOrder(updated);
    } catch (err) {
      // you can show a toast here later
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Orders</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Order details</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          >
            Back to orders
          </button>
        </div>

        {!currentStoreId && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Pick or create a store first from the sidebar to see orders.
          </div>
        )}

        {currentStoreId && (
          <>
            {loading && <p className="text-xs text-slate-500">Loading order…</p>}
            {error && !loading && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {!loading && !error && order && (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Order ID</p>
                      <p className="text-sm font-mono text-slate-900">{order.id}</p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Status:</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Placed on{' '}
                        {new Date(order.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500 space-y-1">
                      <p>
                        Total amount:{' '}
                        <span className="font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</span>
                      </p>
                      {latestPayment && (
                        <p>
                          Payment status:{' '}
                          <span className="font-medium text-slate-800">{latestPayment.status}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">Customer</p>
                      <p className="text-sm text-slate-900">{customer.name || customer.email || 'Guest'}</p>
                      {customer.email && <p className="mt-0.5">{customer.email}</p>}
                      {customer.phone && <p className="mt-0.5">{customer.phone}</p>}
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">Delivery</p>
                      {delivery.deliveryAddress && <p className="mt-0.5">{delivery.deliveryAddress}</p>}
                      {delivery.deliveryLocation && <p className="mt-0.5">{delivery.deliveryLocation}</p>}
                      {delivery.note && <p className="mt-0.5 text-slate-500">Note: {delivery.note}</p>}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                    {canFulfil && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleStatusChange('FULFILLED')}
                        className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Mark as fulfilled
                      </button>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleStatusChange('CANCELLED')}
                        className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-800 hover:border-rose-300 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel order
                      </button>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Items</p>
                      <p className="text-sm text-slate-800">Products in this order</p>
                    </div>
                  </div>

                  {order.items && order.items.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-100">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50/80">
                          <tr className="text-left text-[11px] text-slate-500">
                            <th className="px-3 py-2 font-medium">Product</th>
                            <th className="px-3 py-2 font-medium text-right">Quantity</th>
                            <th className="px-3 py-2 font-medium text-right">Unit price</th>
                            <th className="px-3 py-2 font-medium text-right">Line total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white/80">
                          {order.items.map((item) => {
                            const product = item.product || {};
                            const baseName = product.name || 'Product';
                            const label = item.variant?.label ? `${baseName} (${item.variant.label})` : baseName;
                            const lineTotal = (item.unitPrice || 0) * (item.quantity || 0);
                            return (
                              <tr key={item.id} className="text-[11px] text-slate-700">
                                <td className="px-3 py-2 max-w-xs truncate">{label}</td>
                                <td className="px-3 py-2 text-right">{item.quantity}</td>
                                <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatCurrency(lineTotal)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No items recorded for this order.</p>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
