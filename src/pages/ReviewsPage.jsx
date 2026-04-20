"use client";

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchStoreReviewsForSeller } from '../services/reviews.service.js';

function buyerAliasFromReviewId(reviewId) {
  const compact = String(reviewId || '').replace(/[^a-zA-Z0-9]/g, '');
  const suffix = compact.slice(-6).toUpperCase();
  return suffix ? `Buyer #${suffix}` : 'Buyer';
}

function StarsInline({ value }) {
  const clamped = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  const filledCount = Math.round(clamped);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= filledCount ? 'text-slate-900' : 'text-slate-300'}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const { currentStoreId } = useStoreStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const items = payload?.items || [];
  const total = typeof payload?.total === 'number' ? payload.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const averageRating = typeof payload?.averageRating === 'number' ? payload.averageRating : 0;
  const ratingCount = typeof payload?.ratingCount === 'number' ? payload.ratingCount : 0;

  const summaryLabel = useMemo(() => {
    if (!ratingCount) return 'No ratings yet.';
    return `${averageRating.toFixed(1)} out of 5 (${ratingCount} rating${ratingCount === 1 ? '' : 's'})`;
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
        if (!cancelled) {
          setPayload(data);
        }
      } catch {
        if (!cancelled) {
          setError('We could not load your reviews.');
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
  }, [currentStoreId, page]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Feedback</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ratings & reviews</h1>
            <p className="mt-1 text-sm text-slate-600">{loading ? '—' : summaryLabel}</p>
          </div>
          <Link to="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
            ← Back to dashboard
          </Link>
        </div>

        {!currentStoreId && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Pick or create a store first from the sidebar to view reviews.
          </div>
        )}

        {currentStoreId && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {currentStoreId && !error && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="h-3 w-40 bg-slate-100 rounded" />
                    <div className="mt-3 h-3 w-3/4 bg-slate-100 rounded" />
                    <div className="mt-2 h-3 w-2/3 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-600">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {items.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 text-sm text-slate-900">
                        <StarsInline value={r.rating || 0} />
                        <span className="text-xs text-slate-500">
                          {r.ratedAt ? new Date(r.ratedAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{buyerAliasFromReviewId(r.id)}</span>
                    </div>
                    {r.comment ? (
                      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{r.comment}</p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">No comment left.</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <p className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </p>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
