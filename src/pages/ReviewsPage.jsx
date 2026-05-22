"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreReviewsForSeller } from '../services/reviews.service.js';

function buyerAliasFromReviewId(reviewId) {
  const compact = String(reviewId || '').replace(/[^a-zA-Z0-9]/g, '');
  const suffix = compact.slice(-6).toUpperCase();
  return suffix ? `Buyer #${suffix}` : 'Buyer';
}

function StarsInline({ value, size = 'sm' }) {
  const clamped = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  const filledCount = Math.round(clamped);
  return (
    <span className={`inline-flex items-center gap-0.5 ${size === 'lg' ? 'text-xl' : 'text-sm'}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= filledCount ? 'text-amber-400' : 'text-slate-200'}>★</span>
      ))}
    </span>
  );
}

function SectionCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
      {children}
    </div>
  );
}

const DEFAULT_PAGE_SIZE = 10;

export default function ReviewsPage() {
  const { currentStoreId } = useStoreStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));

  const items = payload?.items || [];
  const total = typeof payload?.total === 'number' ? payload.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const averageRating = typeof payload?.averageRating === 'number' ? payload.averageRating : 0;
  const ratingCount = typeof payload?.ratingCount === 'number' ? payload.ratingCount : 0;

  const summaryLabel = useMemo(() => {
    if (!ratingCount) return 'No ratings yet';
    return `${averageRating.toFixed(1)} average across ${ratingCount} rating${ratingCount === 1 ? '' : 's'}`;
  }, [averageRating, ratingCount]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!currentStoreId) {
        setPayload(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchStoreReviewsForSeller(currentStoreId, { page, pageSize });
        if (!cancelled) setPayload(data);
      } catch {
        if (!cancelled) setError('We could not load your reviews.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentStoreId, page, pageSize]);

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
        {/* Page header */}
        <div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Feedback</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ratings & reviews</h1>
        </div>

        {!currentStoreId && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm text-slate-600">
            Pick or create a store first from the sidebar to view reviews.
          </div>
        )}

        {currentStoreId && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {currentStoreId && !error && (
          <>
            {/* Rating summary */}
            <SectionCard>
              <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center gap-6">
                {loading ? (
                  <div className="animate-pulse flex items-center gap-5">
                    <div className="h-12 w-16 bg-slate-100 rounded-xl" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-slate-100 rounded" />
                      <div className="h-3 w-24 bg-slate-100 rounded" />
                    </div>
                  </div>
                ) : ratingCount === 0 ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">No reviews yet</p>
                    <p className="text-xs text-slate-500">Ratings from your buyers will appear here.</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-5">
                    <div className="text-center">
                      <p className="text-4xl font-bold tracking-tight text-slate-900 leading-none">
                        {averageRating.toFixed(1)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">out of 5</p>
                    </div>
                    <div className="space-y-1.5">
                      <StarsInline value={averageRating} size="lg" />
                      <p className="text-xs text-slate-500">{summaryLabel}</p>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Reviews list */}
            <SectionCard>
              <SectionHeader>
                <p className="text-sm font-semibold text-slate-900">Customer reviews</p>
                {!loading && total > 0 && (
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    {total} total
                  </span>
                )}
              </SectionHeader>

              {loading ? (
                <div className="divide-y divide-slate-100 animate-pulse">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="px-5 py-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-28 bg-slate-100 rounded" />
                        <div className="h-3 w-20 bg-slate-100 rounded" />
                      </div>
                      <div className="h-3 w-3/4 bg-slate-100 rounded" />
                      <div className="h-3 w-1/2 bg-slate-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-slate-500">No reviews on this page.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map((r) => (
                    <div key={r.id} className="px-5 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-semibold text-slate-500">
                              {buyerAliasFromReviewId(r.id).slice(-2)}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-700">{buyerAliasFromReviewId(r.id)}</p>
                            {r.ratedAt && (
                              <p className="text-[11px] text-slate-400">
                                {new Date(r.ratedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StarsInline value={r.rating || 0} />
                          <span className="text-xs font-medium text-slate-600">{(r.rating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                      {r.comment ? (
                        <p className="mt-3 text-sm text-slate-700 leading-relaxed pl-9">{r.comment}</p>
                      ) : (
                        <p className="mt-3 text-xs text-slate-400 pl-9 italic">No written review.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!loading && totalPages > 1 && (
                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </button>
                  <p className="text-xs text-slate-500">
                    Page {page} of {totalPages}
                  </p>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
