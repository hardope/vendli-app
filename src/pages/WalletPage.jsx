"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { useWalletStore } from '../store/wallet.store.js';
import { fetchWallet } from '../services/wallet.service.js';
import { formatCurrency } from '../lib/format.js';
import Notify from '../components/Notify.js';
import {
  fetchPayoutMethods,
  fetchPayoutRequests,
  startCreatePayoutMethod,
  confirmPayoutMethod,
  createPayoutRequest,
} from '../services/payout.service.js';

export default function WalletPage() {
  const { currentStoreId } = useStoreStore();
  const setWalletBalance = useWalletStore((s) => s.setBalance);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [wallet, setWallet] = useState(null);
  const [payoutMethods, setPayoutMethods] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [addingMethod, setAddingMethod] = useState(false);
  const [newMethod, setNewMethod] = useState({
    label: '',
    bankName: '',
    bankCode: '',
    accountName: '',
    accountNumber: '',
  });
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethodId, setPayoutMethodId] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWallet(page, pageSize);
        if (!cancelled) {
          setWallet(data);
          setWalletBalance(data.balance ?? 0);
        }

        const [methods, requests] = await Promise.all([
          fetchPayoutMethods(),
          fetchPayoutRequests(),
        ]);

        if (!cancelled) {
          setPayoutMethods(methods ?? []);
          setPayoutRequests(requests ?? []);
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
  }, [page, pageSize]);

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

          <section className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Payout methods</p>
                <p className="text-sm text-slate-800">Where your payouts can be sent</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddingMethod(true);
                  setOtpStep(false);
                  setOtpCode('');
                }}
                className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] hover:border-slate-300 hover:bg-slate-50"
              >
                Add payout method
              </button>
            </div>

            {addingMethod && !otpStep && (
              <div className="mt-2 grid gap-2 md:grid-cols-2 text-[11px] text-slate-600">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">Label</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-400"
                    placeholder="Main business account"
                    value={newMethod.label}
                    onChange={(e) => setNewMethod((m) => ({ ...m, label: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">Bank name</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-400"
                    placeholder="GTBank"
                    value={newMethod.bankName}
                    onChange={(e) => setNewMethod((m) => ({ ...m, bankName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">Account name</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-400"
                    placeholder="Acme Studios LTD"
                    value={newMethod.accountName}
                    onChange={(e) => setNewMethod((m) => ({ ...m, accountName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">Account number</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-400"
                    placeholder="0123456789"
                    value={newMethod.accountNumber}
                    onChange={(e) => setNewMethod((m) => ({ ...m, accountNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">Bank code (optional)</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-400"
                    placeholder="058"
                    value={newMethod.bankCode}
                    onChange={(e) => setNewMethod((m) => ({ ...m, bankCode: e.target.value }))}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full bg-slate-900 text-slate-50 text-[11px] hover:bg-slate-800"
                    onClick={async () => {
                      try {
                        await startCreatePayoutMethod(newMethod);
                        setOtpStep(true);
                      } catch (e) {
                        // eslint-disable-next-line no-alert
                        alert('Could not start payout method. Please check details and try again.');
                      }
                    }}
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full border border-slate-200 text-[11px] hover:bg-slate-50"
                    onClick={() => {
                      setAddingMethod(false);
                      setNewMethod({
                        label: '',
                        bankName: '',
                        bankCode: '',
                        accountName: '',
                        accountNumber: '',
                      });
                      setOtpStep(false);
                      setOtpCode('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {addingMethod && otpStep && (
              <div className="mt-2 space-y-2 text-[11px] text-slate-600">
                <p>
                  We sent a 6-digit code to the email on your Vendli account. Enter it below to confirm this payout
                  method.
                </p>
                <input
                  className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-center tracking-[0.3em] text-[13px] font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full bg-slate-900 text-slate-50 text-[11px] hover:bg-slate-800"
                    onClick={async () => {
                      try {
                        await confirmPayoutMethod({ otp: otpCode });
                        const [methods, requests] = await Promise.all([
                          fetchPayoutMethods(),
                          fetchPayoutRequests(),
                        ]);
                        setPayoutMethods(methods ?? []);
                        setPayoutRequests(requests ?? []);
                        setAddingMethod(false);
                        setOtpStep(false);
                        setOtpCode('');
                      } catch (e) {
                        // eslint-disable-next-line no-alert
                        alert('Invalid or expired code.');
                      }
                    }}
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full border border-slate-200 text-[11px] hover:bg-slate-50"
                    onClick={() => {
                      setAddingMethod(false);
                      setOtpStep(false);
                      setOtpCode('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!addingMethod && payoutMethods.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11px] text-slate-600">
                {payoutMethods.map((m) => (
                  <li key={m.id} className="flex items-center justify-between">
                    <span>
                      {m.label} · {(m.details?.bankName || '').toString()} ·••••
                      {m.details?.accountNumber ? m.details.accountNumber.slice(-4) : ''}
                    </span>
                    <span className="uppercase tracking-wide text-[10px] text-slate-500">{m.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Payout requests</p>
                <p className="text-sm text-slate-800">Track money moving out of Vendli</p>
              </div>
              <button
                type="button"
                disabled={
                  payoutMethods.filter((m) => m.status === 'ACTIVE').length === 0
                  || payoutRequests.some((p) => p.status === 'PENDING')
                }
                onClick={() => {
                  setRequestingPayout(true);
                  setPayoutAmount('');
                  const active = payoutMethods.find((m) => m.status === 'ACTIVE');
                  setPayoutMethodId(active ? active.id : '');
                }}
                className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-300 hover:bg-slate-50"
              >
                Request payout
              </button>
            </div>

            {requestingPayout && (
              <div className="mt-2 grid gap-2 md:grid-cols-3 text-[11px] text-slate-600">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">Amount</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-400"
                    placeholder="5000"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-500">Available: {formatCurrency(balance)}</p>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">Payout method</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-400"
                    value={payoutMethodId}
                    onChange={(e) => setPayoutMethodId(e.target.value)}
                  >
                    {payoutMethods
                      .filter((m) => m.status === 'ACTIVE')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full bg-slate-900 text-slate-50 text-[11px] hover:bg-slate-800"
                    onClick={async () => {
                      const numericAmount = Number(payoutAmount);
                      if (Number.isNaN(numericAmount) || numericAmount <= 0) {
                        Notify.error('Enter a valid payout amount greater than zero.');
                        return;
                      }
                      if (numericAmount > balance) {
                        Notify.error('You cannot request more than your available balance.');
                        return;
                      }

                      try {
                        await createPayoutRequest({ payoutMethodId, amount: numericAmount });
                        const requests = await fetchPayoutRequests();
                        setPayoutRequests(requests ?? []);
                        setRequestingPayout(false);
                        Notify.success('Payout request created and awaiting processing.');
                      } catch (e) {
                        Notify.error('Could not create payout request. Please check the amount and try again.');
                      }
                    }}
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full border border-slate-200 text-[11px] hover:bg-slate-50"
                    onClick={() => {
                      setRequestingPayout(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {payoutRequests.length > 0 && (
              <div className="mt-2 overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-slate-50/80 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Method</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white/80">
                    {payoutRequests.map((p) => {
                      const created = new Date(p.createdAt);
                      const formattedDate = created.toLocaleDateString();
                      return (
                        <tr key={p.id} className="text-slate-700">
                          <td className="px-3 py-2 whitespace-nowrap">{formattedDate}</td>
                          <td className="px-3 py-2">{p.payoutMethod?.label ?? '—'}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(p.amount)}</td>
                          <td className="px-3 py-2 text-right uppercase tracking-wide text-[10px] text-slate-500">{p.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
                        <th className="px-3 py-2 font-medium">Store</th>
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
                            <td className="px-3 py-2 max-w-40 truncate text-[11px] text-slate-600">{tx.storeName || '-'}</td>
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
