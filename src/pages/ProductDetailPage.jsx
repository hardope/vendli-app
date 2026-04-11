"use client";

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchProductOverview, archiveProduct } from '../services/product.service.js';
import { formatCurrency, formatNumberWithCommas } from '../lib/format.js';
import Notify from '../components/Notify.js';

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const currentStoreId = useStoreStore((s) => s.currentStoreId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!productId) {
        navigate('/products', { replace: true });
        return;
      }
      if (!currentStoreId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const data = await fetchProductOverview(currentStoreId, productId);
        if (cancelled) return;
        setOverview(data ?? null);
      } catch (e) {
        if (!cancelled) {
          setError('We could not load product analytics.');
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
  }, [currentStoreId, productId, navigate]);

  const product = overview?.product;
  const stats = overview?.stats;

  const handleArchive = async () => {
    if (!currentStoreId || !productId) return;
    setArchiving(true);
    try {
      await archiveProduct(currentStoreId, productId);
      Notify.success('Product archived.');
      navigate('/products');
    } catch (e) {
      Notify.error('We could not archive this product. Please try again.');
    } finally {
      setArchiving(false);
      setConfirmArchive(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            ← Back to products
          </button>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <button
              type="button"
              onClick={() => navigate(`/products/${productId}/edit`)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-60"
              disabled={!product}
            >
              Edit product
            </button>
            <button
              type="button"
              onClick={() => setConfirmArchive(true)}
              className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              disabled={!product || archiving}
            >
              Archive
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {product?.name || 'Product details'}
          </h1>
          {product?.slug && (
            <p className="text-[11px] text-slate-500 mt-0.5">Slug: {product.slug}</p>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-800">
            {error}
          </div>
        )}

        {loading && !error && (
          <p className="text-[11px] text-slate-500">Loading product analytics…</p>
        )}

        {product && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 md:flex-row md:items-start">
            <div className="w-full md:w-1/3 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] text-slate-400 py-10">No image</span>
              )}
            </div>
            <div className="flex-1 space-y-2 text-[11px] text-slate-600">
              <p className="text-sm font-semibold text-slate-900">{product.name}</p>
              {product.description && (
                <p className="text-[11px] text-slate-600 whitespace-pre-line max-h-40 overflow-y-auto">
                  {product.description}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Price</p>
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(product.price)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Stock</p>
                  <p className="text-sm font-semibold text-slate-900">{product.stock ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Status</p>
                  <p className="text-sm font-semibold text-slate-900">{product.status}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {stats && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-600 mb-3">Performance</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-600">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Total sold</p>
                <p className="text-sm font-semibold text-slate-900">{formatNumberWithCommas(stats.totalSold)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Total revenue</p>
                <p className="text-sm font-semibold text-slate-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Total views</p>
                <p className="text-sm font-semibold text-slate-900">{formatNumberWithCommas(stats.totalViews)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Total impressions</p>
                <p className="text-sm font-semibold text-slate-900">{formatNumberWithCommas(stats.totalImpressions)}</p>
              </div>
            </div>
          </section>
        )}

        {confirmArchive && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5 space-y-3 text-[11px] text-slate-700">
              <p className="text-xs font-semibold text-slate-900">Archive this product?</p>
              <p>
                The product will be marked as archived and will no longer be available on your storefront. You can
                still see it in your dashboard.
              </p>
              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setConfirmArchive(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-700"
                  disabled={archiving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={archiving}
                  className="inline-flex items-center justify-center rounded-full bg-rose-500 text-white px-3 py-1.5 text-[11px] font-medium hover:bg-rose-600 disabled:opacity-60"
                >
                  {archiving ? 'Archiving…' : 'Yes, archive'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
