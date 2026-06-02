"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchProducts, updateProductStatus } from '../services/product.service.js';
import Notify from '../components/Notify.js';
import { getCached, setCached, invalidatePrefix } from '../lib/queryCache.js';
import { SkeletonProductCard } from '../components/Skeleton.jsx';

const DEFAULT_PAGE_SIZE = 12;

export default function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentStoreId = useStoreStore((s) => s.currentStoreId);
  const stores = useStoreStore((s) => s.stores);

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));
  const search = searchParams.get('q') || '';

  const [searchInput, setSearchInput] = useState(search);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);

  const prevStoreIdRef = useRef(currentStoreId);

  const currentStore = useMemo(
    () => stores.find((s) => s.id === currentStoreId) || null,
    [stores, currentStoreId],
  );

  // Reset params when the active store changes
  useEffect(() => {
    if (prevStoreIdRef.current !== null && prevStoreIdRef.current !== currentStoreId) {
      setSearchParams({}, { replace: true });
      setSearchInput('');
    }
    prevStoreIdRef.current = currentStoreId;
  }, [currentStoreId, setSearchParams]);

  // Sync search input with URL (e.g. browser back/forward)
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!currentStoreId) {
        setProducts([]);
        setTotal(0);
        return;
      }

      const cacheKey = `products:${currentStoreId}:${page}:${pageSize}:${search}`;
      const cached = getCached(cacheKey);
      if (cached) {
        setProducts(cached.items);
        setTotal(cached.total);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = { page, pageSize };
        if (search) params.q = search;

        const data = await fetchProducts(currentStoreId, params);
        if (cancelled) return;

        const items = Array.isArray(data?.items) ? data.items : [];
        const fetchedTotal = typeof data?.total === 'number' ? data.total : items.length;

        setCached(cacheKey, { items, total: fetchedTotal });
        setProducts(items);
        setTotal(fetchedTotal);
      } catch {
        if (!cancelled) setError('We could not load your products.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentStoreId, page, pageSize, search]);

  const totals = useMemo(() => {
    const active = products.filter((p) => p.status === 'PUBLISHED' && (p.stock ?? 0) > 0).length;
    const lowStock = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 10).length;
    return { total, active, inactive: total - active, lowStock };
  }, [products, total]);

  const totalPages = useMemo(
    () => (pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1),
    [total, pageSize],
  );

  const setPage = (newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage <= 1) next.delete('page');
      else next.set('page', String(newPage));
      return next;
    }, { replace: true });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const q = searchInput.trim();
      if (q) next.set('q', q);
      else next.delete('q');
      next.delete('page');
      return next;
    });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('q');
      next.delete('page');
      return next;
    });
  };

  const handleTogglePublish = async (product) => {
    if (!currentStoreId) return;
    try {
      const nextStatus = product.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      const updated = await updateProductStatus(currentStoreId, product.id, nextStatus);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      invalidatePrefix(`products:${currentStoreId}`);
    } catch {
      Notify.error('Could not update product status. Please try again.');
    }
  };

  const buildProductShareUrl = (product) => {
    if (!currentStore || !product?.slug) return '';
    const baseHost = import.meta.env.VITE_STOREFRONT_BASE_URL || window.location.host;
    if (!baseHost) return '';
    const protocol = window.location?.protocol || 'https:';
    return `${protocol}//${currentStore.slug}.${baseHost}/product/${encodeURIComponent(product.slug)}`;
  };

  const handleShareProduct = async (event, product) => {
    event.stopPropagation();
    const url = buildProductShareUrl(product);
    if (!url) {
      Notify.error('We could not determine the product link yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      Notify.success('Product link copied to clipboard');
    } catch {
      Notify.error('We could not copy the product link. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Catalog</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Products</h1>
          </div>
          {currentStoreId && (
            <button
              type="button"
              onClick={() => navigate('/products/new')}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white text-sm font-semibold px-4 py-2 hover:bg-slate-800 transition-colors"
            >
              Add product
            </button>
          )}
        </div>

        {!currentStoreId && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm text-slate-500">
            Pick or create a store from the sidebar to manage its products.
          </div>
        )}

        {currentStoreId && (
          <>
            {/* Stats row */}
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { label: 'Total', value: totals.total, color: 'text-slate-900' },
                { label: 'Published', value: totals.active, color: 'text-emerald-600' },
                { label: 'Unpublished', value: totals.inactive, color: 'text-slate-500' },
                { label: 'Low stock', value: totals.lowStock, color: 'text-amber-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                  <p className={`text-2xl font-semibold ${color}`}>{loading ? '—' : value}</p>
                </div>
              ))}
            </div>

            {/* Search + product grid */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {/* Card header with search */}
              <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Inventory</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {loading ? 'Loading…' : `${total} product${total === 1 ? '' : 's'}${search ? ` for "${search}"` : ''}`}
                  </p>
                </div>
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-44 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-8 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:bg-white transition-colors"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]"
                        aria-label="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white text-xs font-medium px-3 py-1.5 hover:bg-slate-800 transition-colors"
                  >
                    Search
                  </button>
                </form>
              </div>

              {error && (
                <div className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {/* Product grid */}
              {loading ? (
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonProductCard key={i} />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm font-medium text-slate-500">No products yet</p>
                  <p className="mt-1 text-xs text-slate-400">Use "Add product" to create your first item.</p>
                </div>
              ) : (
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {products.map((product) => {
                    const stock = product.stock ?? 0;
                    const isLowStock = stock > 0 && stock < 10;
                    const isPublished = product.status === 'PUBLISHED';
                    const isActive = isPublished && stock > 0;
                    return (
                      <div
                        key={product.id}
                        className="group rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all flex flex-col overflow-hidden cursor-pointer"
                        onClick={() => navigate(`/products/${product.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/products/${product.id}`); }
                        }}
                      >
                        {/* Image */}
                        <div className="relative h-36 w-full overflow-hidden bg-slate-50">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <svg className="h-8 w-8 text-slate-200" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                              </svg>
                            </div>
                          )}
                          {/* Status dot */}
                          <div className="absolute top-2 left-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border backdrop-blur-sm ${isActive ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200' : 'bg-white/90 text-slate-500 border-slate-200'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                              {isActive ? 'Live' : 'Off'}
                            </span>
                          </div>
                          {isLowStock && (
                            <div className="absolute top-2 right-2">
                              <span className="inline-flex items-center rounded-full bg-amber-50/90 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700 backdrop-blur-sm">
                                Low stock
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 flex flex-col px-3 pt-2.5 pb-3 gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate leading-snug">{product.name}</p>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className="text-[11px] text-slate-500">₦{Number(product.price ?? 0).toLocaleString()}</p>
                              <p className="text-[10px] text-slate-400">{stock} in stock</p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 pt-0.5 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigate(`/products/${product.id}/edit`); }}
                              className="flex-1 inline-flex items-center justify-center rounded-lg py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              Edit
                            </button>
                            <div className="w-px h-4 bg-slate-100" />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleTogglePublish(product); }}
                              className={`flex-1 inline-flex items-center justify-center rounded-lg py-1.5 text-[11px] font-medium transition-colors ${isPublished ? 'text-slate-500 hover:bg-slate-50' : 'text-emerald-700 hover:bg-emerald-50'}`}
                            >
                              {isPublished ? 'Unpublish' : 'Publish'}
                            </button>
                            <div className="w-px h-4 bg-slate-100" />
                            <button
                              type="button"
                              onClick={(e) => handleShareProduct(e, product)}
                              className="inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                              title="Copy product link"
                            >
                              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                                <circle cx="12" cy="3" r="1.5" />
                                <circle cx="12" cy="13" r="1.5" />
                                <circle cx="4" cy="8" r="1.5" />
                                <path d="M10.5 4l-5 3M10.5 12l-5-3" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 hover:border-slate-300 transition-colors"
                  >
                    Previous
                  </button>
                  <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 hover:border-slate-300 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
