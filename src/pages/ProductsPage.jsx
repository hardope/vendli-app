"use client";

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchProducts, updateProductStatus } from '../services/product.service.js';
import Notify from '../components/Notify.js';

export default function ProductsPage() {
  const navigate = useNavigate();
  const { currentStoreId, stores } = useStoreStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const currentStore = useMemo(
    () => stores.find((s) => s.id === currentStoreId) || null,
    [stores, currentStoreId],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!currentStoreId) {
        setProducts([]);
        setTotal(0);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = { page, pageSize };
        if (search) params.q = search;

        const data = await fetchProducts(currentStoreId, params);
        if (cancelled) return;
        setProducts(Array.isArray(data?.items) ? data.items : []);
        setTotal(typeof data?.total === 'number' ? data.total : data?.items?.length || 0);
      } catch (err) {
        if (!cancelled) {
          setError('We could not load your products.');
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
  }, [currentStoreId, page, pageSize, search]);

  const totals = useMemo(() => {
    const totalCount = total;
    const active = products.filter((p) => p.status === 'PUBLISHED' && (p.stock ?? 0) > 0).length;
    const inactive = totalCount - active;
    const lowStock = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 10).length;
    return { total: totalCount, active, inactive, lowStock };
  }, [products, total]);

  const totalPages = useMemo(
    () => (pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1),
    [total, pageSize],
  );

  const handleTogglePublish = async (product) => {
    if (!currentStoreId) return;
    try {
      const nextStatus = product.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      const updated = await updateProductStatus(currentStoreId, product.id, nextStatus);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const buildProductShareUrl = (product) => {
    if (!currentStore || !product?.slug) return '';
    const baseHost = import.meta.env.VITE_STOREFRONT_BASE_URL || window.location.host;
    if (!baseHost) return '';

    const protocol = typeof window !== 'undefined' && window.location?.protocol
      ? window.location.protocol
      : 'https:';

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
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      Notify.error('We could not copy the product link. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Catalog</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Products</h1>
          </div>
          {currentStoreId && (
            <button
              type="button"
              onClick={() => navigate('/products/new')}
              className="inline-flex items-center justify-center rounded-full bg-amber-400 text-slate-950 text-xs font-semibold px-4 py-2 hover:bg-amber-300 transition-colors"
            >
              Add product
            </button>
          )}
        </div>

        {!currentStoreId && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Pick or create a store from the sidebar to manage its products.
          </div>
        )}

        {currentStoreId && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Search products…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-medium px-3 py-1.5 hover:bg-slate-800"
                >
                  Search
                </button>
              </form>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Showing {products.length} of {total} products
                  {search && (
                    <span>
                      {' '}
                      for "{search}"
                    </span>
                  )}
                </span>
                {totalPages > 1 && (
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </section>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 mt-2">
                {error}
              </div>
            )}

            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-1">
                <p className="text-[11px] font-medium text-slate-500">Total products</p>
                <p className="text-xl font-semibold text-slate-900">{totals.total}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-1">
                <p className="text-[11px] font-medium text-slate-500">Active</p>
                <p className="text-xl font-semibold text-emerald-600">{totals.active}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-1">
                <p className="text-[11px] font-medium text-slate-500">Inactive</p>
                <p className="text-xl font-semibold text-slate-900">{totals.inactive}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-1">
                <p className="text-[11px] font-medium text-slate-500">Low stock (&lt; 10)</p>
                <p className="text-xl font-semibold text-amber-600">{totals.lowStock}</p>
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600">Products</p>
                {loading && <p className="text-[11px] text-slate-500">Loading…</p>}
              </div>
              {products.length === 0 && !loading && (
                <div className="px-4 py-6 text-sm text-slate-500">
                  No products yet. Use "Add product" to create your first item.
                </div>
              )}
              {products.length > 0 && (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {products.map((product) => {
                    const stock = product.stock ?? 0;
                    const isLowStock = stock > 0 && stock < 10;
                    const isActive = product.status === 'PUBLISHED' && stock > 0;
                    return (
                      <div
                        key={product.id}
                        className="group rounded-2xl border border-slate-200 bg-white hover:border-amber-300 hover:shadow-sm transition-all flex flex-col overflow-hidden cursor-pointer"
                        onClick={() => navigate(`/products/${product.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/products/${product.id}/edit`);
                          }
                        }}
                      >
                        <div
                          className="relative h-28 w-full overflow-hidden bg-slate-50 flex items-center justify-center"
                        >
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-slate-400">No image</span>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col px-3 py-2 gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">{product.name}</p>
                              <p className="text-[11px] text-slate-500 truncate">
                                ₦{product.price?.toFixed?.(2) ?? product.price}
                              </p>
                            </div>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                            <span
                              className={
                                isActive
                                  ? 'inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200'
                              }
                            >
                              {isActive ? 'Active' : 'Not active'}
                            </span>
                            {isLowStock && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Low stock
                              </span>
                            )}
                            <span className="text-slate-400">Stock: {stock}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/products/${product.id}/edit`);
                              }}
                              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-amber-400 hover:text-amber-800 hover:bg-amber-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePublish(product);
                              }}
                              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-amber-400 hover:text-amber-800 hover:bg-amber-50"
                            >
                              {product.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleShareProduct(e, product)}
                              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 hover:border-emerald-300 hover:text-emerald-800 hover:bg-emerald-50"
                            >
                              <span className="sr-only">Share</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              >
                                <path d="M15 2.5a.75.75 0 0 0-1.5 0v7.19L6.53 2.72a.75.75 0 0 0-1.06 1.06L12.44 10.75H5.25a.75.75 0 0 0 0 1.5h9a.75.75 0 0 0 .75-.75v-9Z" />
                                <path d="M4.25 6A2.25 2.25 0 0 0 2 8.25v5.5A2.25 2.25 0 0 0 4.25 16h8.5A2.25 2.25 0 0 0 15 13.75V13a.75.75 0 0 0-1.5 0v.75c0 .414-.336.75-.75.75h-8.5a.75.75 0 0 1-.75-.75v-5.5c0-.414.336-.75.75-.75H6A.75.75 0 0 0 6 6H4.25Z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
