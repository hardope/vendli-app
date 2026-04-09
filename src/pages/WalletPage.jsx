"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { useWalletStore } from '../store/wallet.store.js';
import { fetchWallet } from '../services/wallet.service.js';
import { formatCurrency } from '../lib/format.js';

export default function WalletPage() {
  const { currentStoreId } = useStoreStore();
  const setWalletBalance = useWalletStore((s) => s.setBalance);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWallet(page, pageSize, currentStoreId || undefined);
        if (!cancelled) {
          setWallet(data);
          setWalletBalance(data.balance ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError('We could not load your wallet.');
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

  const balance = wallet?.balance ?? 0;
  const items = wallet?.items ?? [];
  const total = wallet?.totalTransactions ?? 0;
  const hasPrev = page > 1;
  const hasNext = page * pageSize < total;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Wallet</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Balance & transactions</h1>
            <p className="mt-1 text-[11px] text-slate-500">
              Your Vendli wallet is global across all your stores.
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Vendli charges a transparent platform fee on each successful order. You can always review the exact percentage and examples on the{' '}
              <a
                href="https://www.vendli.ng#pricing"
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline text-slate-600"
              >
                Pricing page
              </a>
              .
            </p>
          </div>
        </div>

        <>
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Current balance</p>
                  <p className="text-3xl font-semibold text-slate-900">{formatCurrency(balance)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    This is the amount currently available in your Vendli wallet.
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500 space-y-1">
                  <p>
                    All-time deposits:{' '}
                    <span className="font-medium text-slate-800">{formatCurrency(wallet?.allTimeDeposits ?? 0)}</span>
                  </p>
                  <p>
                    All-time withdrawals:{' '}
                    <span className="font-medium text-slate-800">{formatCurrency(wallet?.allWithdrawals ?? 0)}</span>
                  </p>
                  <p>
                    Total transactions:{' '}
                    <span className="font-medium text-slate-800">{total}</span>
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Transactions</p>
                  <p className="text-sm text-slate-800">Most recent activity</p>
                </div>
                <p className="text-[11px] text-slate-500">Showing {items.length} of {total} transactions</p>
              </div>

              {loading && (
                <p className="text-xs text-slate-500">Loading wallet activity…</p>
              )}

              {!loading && items.length === 0 && (
                <p className="text-xs text-slate-500">No transactions yet. New sales will appear here.</p>
              )}

              {!loading && items.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-[11px] text-slate-500">
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Label</th>
                        <th className="px-3 py-2 font-medium text-right">Amount</th>
                        <th className="px-3 py-2 font-medium text-right">Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/80">
                      {items.map((tx) => {
                        const created = new Date(tx.createdAt);
                        const formattedDate = created.toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const isCredit = tx.amount >= 0;
                        const absAmount = Math.abs(tx.amount);
                        const amountLabel = `${isCredit ? '+' : '-'}${formatCurrency(absAmount)}`;

                        return (
                          <tr key={tx.id} className="text-[11px] text-slate-700">
                            <td className="px-3 py-2 whitespace-nowrap">{formattedDate}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 max-w-xs truncate text-[11px] text-slate-700">{tx.label || '—'}</td>
                            <td
                              className={
                                `px-3 py-2 text-right font-semibold ${
                                  isCredit ? 'text-emerald-600' : 'text-rose-600'
                                }`
                              }
                            >
                              {amountLabel}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-500">{tx.orderId ? tx.orderId.slice(0, 8) : '-'}</td>
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
          </>
      </div>
    </DashboardLayout>
  );
}
