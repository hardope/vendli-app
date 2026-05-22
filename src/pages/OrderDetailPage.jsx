"use client";

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreOrder, updateStoreOrderStatus } from '../services/order.service.js';
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${map[status] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
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
      if (!currentStoreId || !orderId) { setOrder(null); return; }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStoreOrder(currentStoreId, orderId);
        if (!cancelled) setOrder(data);
      } catch {
        if (!cancelled) setError('We could not load this order.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentStoreId, orderId]);

  const latestPayment = useMemo(() => {
    if (!order?.payments?.length) return null;
    return order.payments[0];
  }, [order]);

  const delivery = order?.deliveryDetails || {};
  const customer = order?.customer || {};
  const canFulfil = order?.status === 'PAID';
  const canCancel = order?.status === 'PAID' || order?.status === 'PENDING';

  const handleStatusChange = async (next) => {
    if (!currentStoreId || !orderId) return;
    const confirmMsg = next === 'FULFILLED'
      ? 'Mark this order as fulfilled?'
      : 'Cancel this order?';
    if (!window.confirm(confirmMsg)) return;
    setSaving(true);
    try {
      const updated = await updateStoreOrderStatus(currentStoreId, orderId, next);
      setOrder(updated);
    } finally {
      setSaving(false);
    }
  };

  const placedDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';

  const placedTime = order?.createdAt
    ? new Date(order.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Order</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 font-mono">
              {order ? `#${order.id.slice(0, 8).toUpperCase()}` : 'Order details'}
            </h1>
          </div>
          {order && (
            <div className="flex items-center gap-2 pt-1 shrink-0">
              {canFulfil && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleStatusChange('FULFILLED')}
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  Mark fulfilled
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleStatusChange('CANCELLED')}
                  className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  Cancel order
                </button>
              )}
            </div>
          )}
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

        {currentStoreId && loading && (
          <div className="space-y-4 animate-pulse">
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-3">
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-3 w-48 bg-slate-100 rounded" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-3">
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                  <div className="h-3 w-36 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStoreId && !loading && !error && order && (
          <>
            {/* Overview */}
            <SectionCard>
              <SectionHeader>
                <p className="text-sm font-semibold text-slate-900">Overview</p>
                <StatusBadge status={order.status} />
              </SectionHeader>
              <div className="px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex-1 space-y-1">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Order ID</p>
                  <p className="text-sm font-mono text-slate-900 break-all">{order.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Placed</p>
                  <p className="text-sm text-slate-900">{placedDate}</p>
                  {placedTime && <p className="text-[11px] text-slate-500">{placedTime}</p>}
                </div>
                <div className="space-y-1 sm:text-right">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total</p>
                  <p className="text-2xl font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                  {latestPayment && (
                    <p className="text-[11px] text-slate-500">Payment: {latestPayment.status}</p>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Customer + Delivery */}
            <div className="grid md:grid-cols-2 gap-4">
              <SectionCard>
                <SectionHeader>
                  <p className="text-sm font-semibold text-slate-900">Customer</p>
                </SectionHeader>
                <div className="px-5 py-5 space-y-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Name</p>
                    <p className="text-sm text-slate-900">{customer.name || customer.email || 'Guest'}</p>
                  </div>
                  {customer.email && (
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Email</p>
                      <p className="text-sm text-slate-900 break-all">{customer.email}</p>
                    </div>
                  )}
                  {customer.phone && (
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                      <p className="text-sm text-slate-900">{customer.phone}</p>
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard>
                <SectionHeader>
                  <p className="text-sm font-semibold text-slate-900">Delivery</p>
                </SectionHeader>
                <div className="px-5 py-5 space-y-3">
                  {delivery.deliveryAddress ? (
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Address</p>
                      <p className="text-sm text-slate-900">{delivery.deliveryAddress}</p>
                    </div>
                  ) : null}
                  {delivery.deliveryLocation ? (
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Location</p>
                      <p className="text-sm text-slate-900">{delivery.deliveryLocation}</p>
                    </div>
                  ) : null}
                  {delivery.note ? (
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Note</p>
                      <p className="text-sm text-slate-600 italic">{delivery.note}</p>
                    </div>
                  ) : null}
                  {!delivery.deliveryAddress && !delivery.deliveryLocation && !delivery.note && (
                    <p className="text-sm text-slate-500">No delivery details.</p>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Items */}
            <SectionCard>
              <SectionHeader>
                <p className="text-sm font-semibold text-slate-900">Items</p>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                </span>
              </SectionHeader>

              {order.items && order.items.length > 0 ? (
                <>
                  <div className="divide-y divide-slate-100">
                    {order.items.map((item) => {
                      const prod = item.product || {};
                      const baseName = prod.name || 'Product';
                      const label = item.variant?.label ? `${baseName} (${item.variant.label})` : baseName;
                      const lineTotal = (item.unitPrice || 0) * (item.quantity || 0);
                      return (
                        <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                          {prod.image && (
                            <img src={prod.image} alt={baseName} className="h-10 w-10 rounded-lg object-cover border border-slate-100 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{label}</p>
                            <p className="text-[11px] text-slate-500">
                              {formatCurrency(item.unitPrice)} × {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 shrink-0">{formatCurrency(lineTotal)}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">Order total</p>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                  </div>
                </>
              ) : (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-slate-500">No items recorded for this order.</p>
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
