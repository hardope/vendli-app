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

const STATUS_STYLES = {
  ACTIVE:    'bg-emerald-50 text-emerald-700 border border-emerald-100',
  PENDING:   'bg-amber-50 text-amber-700 border border-amber-100',
  COMPLETED: 'bg-slate-50 text-slate-500 border border-slate-100',
  FAILED:    'bg-rose-50 text-rose-600 border border-rose-100',
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] ?? 'bg-slate-50 text-slate-500 border border-slate-100';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}

function SectionCard({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ label, title, action }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-slate-100">
      <div>
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-medium text-slate-800">{title}</p>
      </div>
      {action}
    </div>
  );
}

const EMPTY_METHOD = { label: '', bankName: '', bankCode: '', accountName: '', accountNumber: '' };

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
  const [newMethod, setNewMethod] = useState(EMPTY_METHOD);
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
        const [methods, requests] = await Promise.all([fetchPayoutMethods(), fetchPayoutRequests()]);
        if (!cancelled) {
          setPayoutMethods(methods ?? []);
          setPayoutRequests(requests ?? []);
        }
      } catch {
        if (!cancelled) setError('We could not load your wallet. Please refresh the page.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [page, pageSize]);

  const balance = wallet?.balance ?? 0;
  const items = wallet?.items ?? [];
  const total = wallet?.totalTransactions ?? 0;
  const hasPrev = page > 1;
  const hasNext = page * pageSize < total;
  const activeMethod = payoutMethods.find((m) => m.status === 'ACTIVE');
  const hasPendingRequest = payoutRequests.some((p) => p.status === 'PENDING');

  function openAddMethod() {
    setAddingMethod(true);
    setOtpStep(false);
    setOtpCode('');
    setNewMethod(EMPTY_METHOD);
  }

  function cancelAddMethod() {
    setAddingMethod(false);
    setOtpStep(false);
    setOtpCode('');
    setNewMethod(EMPTY_METHOD);
  }

  function openRequestPayout() {
    setRequestingPayout(true);
    setPayoutAmount('');
    setPayoutMethodId(activeMethod ? activeMethod.id : '');
  }

  async function handleStartMethod() {
    try {
      await startCreatePayoutMethod(newMethod);
      setOtpStep(true);
    } catch {
      Notify.error('Could not start payout method. Please check the details and try again.');
    }
  }

  async function handleConfirmMethod() {
    try {
      await confirmPayoutMethod({ otp: otpCode });
      const [methods, requests] = await Promise.all([fetchPayoutMethods(), fetchPayoutRequests()]);
      setPayoutMethods(methods ?? []);
      setPayoutRequests(requests ?? []);
      cancelAddMethod();
      Notify.success('Payout method added successfully.');
    } catch {
      Notify.error('Invalid or expired code. Please try again.');
    }
  }

  async function handleSubmitPayout() {
    const numericAmount = Number(payoutAmount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      Notify.error('Enter a valid amount greater than zero.');
      return;
    }
    if (numericAmount > balance) {
      Notify.error('Amount exceeds your available balance.');
      return;
    }
    try {
      await createPayoutRequest({ payoutMethodId, amount: numericAmount });
      const requests = await fetchPayoutRequests();
      setPayoutRequests(requests ?? []);
      setRequestingPayout(false);
      Notify.success("Payout request submitted. We'll process it shortly.");
    } catch {
      Notify.error('Could not submit the payout request. Please try again.');
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-5 pb-10">

        {/* Page header */}
        <div className="pt-1">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Wallet</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Your earnings</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-lg">
            Money from your sales lands here. Add a bank account and withdraw whenever you're ready.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            {error}
          </div>
        )}

        {/* Balance hero */}
        <SectionCard>
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">Available balance</p>
                <p className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                  {formatCurrency(balance)}
                </p>
                <p className="mt-2 text-xs text-slate-400">Funds available for immediate withdrawal</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <button
                  type="button"
                  disabled={balance <= 0 || !activeMethod || hasPendingRequest}
                  onClick={openRequestPayout}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M8 2v9M4 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Withdraw funds
                </button>
                <button
                  type="button"
                  onClick={openAddMethod}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Add bank account
                </button>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4">
              {[
                { label: 'Total deposited', value: formatCurrency(wallet?.allTimeDeposits ?? 0) },
                { label: 'Total withdrawn', value: formatCurrency(wallet?.allWithdrawals ?? 0) },
                { label: 'Transactions', value: total },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] text-slate-400 mb-1">{label}</p>
                  <p className="text-base font-semibold text-slate-800 tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Payout methods */}
        <SectionCard>
          <SectionHeader
            label="Payout methods"
            title="Where we send your money"
            action={
              <button
                type="button"
                onClick={openAddMethod}
                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Add account
              </button>
            }
          />

          <div className="p-5 space-y-4">
            {/* Add method — details step */}
            {addingMethod && !otpStep && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                <p className="text-xs font-medium text-slate-700">Enter your bank details</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { key: 'label',         label: 'Nickname',                placeholder: 'e.g. Business account' },
                    { key: 'bankName',      label: 'Bank name',               placeholder: 'e.g. GTBank' },
                    { key: 'accountName',   label: 'Account name',            placeholder: 'e.g. Acme Studios LTD' },
                    { key: 'accountNumber', label: 'Account number',          placeholder: '0123456789' },
                    { key: 'bankCode',      label: 'Sort / routing code',     placeholder: '058 (optional)' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-600">{label}</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        placeholder={placeholder}
                        value={newMethod[key]}
                        onChange={(e) => setNewMethod((m) => ({ ...m, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleStartMethod}
                    className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    onClick={cancelAddMethod}
                    className="px-4 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Add method — OTP step */}
            {addingMethod && otpStep && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-700 mb-1">Verify your email</p>
                  <p className="text-[12px] text-slate-500">We sent a 6-digit code to the email on your Vendli account. Enter it below to confirm this bank account.</p>
                </div>
                <div className="flex items-center gap-2">
                  {[0,1,2,3,4,5].map((i) => (
                    <div
                      key={i}
                      className={`w-9 h-11 rounded-lg border flex items-center justify-center text-base font-semibold ${
                        otpCode[i] ? 'border-slate-900 bg-white text-slate-900' : 'border-slate-200 bg-white text-slate-300'
                      }`}
                    >
                      {otpCode[i] || '·'}
                    </div>
                  ))}
                  <input
                    className="sr-only"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    autoFocus
                    aria-label="OTP code"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Click the boxes above to type your code</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={otpCode.length !== 6}
                    onClick={handleConfirmMethod}
                    className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Verify account
                  </button>
                  <button
                    type="button"
                    onClick={cancelAddMethod}
                    className="px-4 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Methods list */}
            {!addingMethod && payoutMethods.length === 0 && (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 20 20"><rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 9h16" stroke="currentColor" strokeWidth="1.5"/></svg>
                </div>
                <p className="text-sm font-medium text-slate-600">No bank accounts yet</p>
                <p className="text-xs text-slate-400 mt-1">Add an account to start withdrawing your earnings</p>
                <button
                  type="button"
                  onClick={openAddMethod}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Add bank account
                </button>
              </div>
            )}

            {!addingMethod && payoutMethods.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {payoutMethods.map((m) => (
                  <div
                    key={m.id}
                    className={`relative rounded-xl border p-4 bg-white ${m.status === 'ACTIVE' ? 'border-emerald-200' : 'border-slate-100'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 16 16"><rect x="1" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M1 7.5h14" stroke="currentColor" strokeWidth="1.2"/></svg>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">{m.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{(m.details?.bankName || '').toString()}</p>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      ····{m.details?.accountNumber ? m.details.accountNumber.slice(-4) : '····'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Payout requests */}
        <SectionCard>
          <SectionHeader
            label="Withdrawals"
            title="Payout requests"
            action={
              <button
                type="button"
                disabled={!activeMethod || hasPendingRequest || balance <= 0}
                onClick={openRequestPayout}
                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                Request payout
              </button>
            }
          />

          <div className="p-5 space-y-4">
            {/* Payout request form */}
            {requestingPayout && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                <p className="text-xs font-medium text-slate-700">New withdrawal request</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-600">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">₦</span>
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-3 py-1.5 text-[12px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        placeholder="0.00"
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Available: {formatCurrency(balance)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-600">To account</label>
                    <select
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      value={payoutMethodId}
                      onChange={(e) => setPayoutMethodId(e.target.value)}
                    >
                      {payoutMethods.filter((m) => m.status === 'ACTIVE').map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSubmitPayout}
                    className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
                  >
                    Submit request
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestingPayout(false)}
                    className="px-4 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {payoutRequests.length === 0 && !requestingPayout && (
              <div className="text-center py-8">
                <p className="text-sm font-medium text-slate-500">No payout requests yet</p>
                <p className="text-xs text-slate-400 mt-1">When you request a withdrawal, it will appear here</p>
              </div>
            )}

            {payoutRequests.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-slate-50/80">
                    <tr className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">To account</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {payoutRequests.map((p) => (
                      <tr key={p.id} className="text-slate-700 hover:bg-slate-50/50">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">{new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td className="px-4 py-3 font-medium">{p.payoutMethod?.label ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3 text-right"><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Transactions */}
        <SectionCard>
          <SectionHeader
            label="Transactions"
            title="Activity history"
            action={
              <span className="text-[11px] text-slate-400">
                {items.length} of {total}
              </span>
            }
          />

          <div className="p-5">
            {loading && (
              <div className="flex items-center gap-2 py-8 justify-center text-sm text-slate-400">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30" strokeDashoffset="10"/></svg>
                Loading transactions…
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm font-medium text-slate-500">No transactions yet</p>
                <p className="text-xs text-slate-400 mt-1">Sales and payouts will appear here</p>
              </div>
            )}

            {!loading && items.length > 0 && (
              <>
                {/* Mobile list */}
                <div className="space-y-2 md:hidden">
                  {items.map((tx) => {
                    const isCredit = tx.amount >= 0;
                    const amountLabel = `${isCredit ? '+' : '-'}${formatCurrency(Math.abs(tx.amount))}`;
                    return (
                      <div key={tx.id} className="rounded-xl border border-slate-100 bg-white p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{tx.label || '—'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{tx.storeName || '—'}</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {new Date(tx.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold tabular-nums ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>{amountLabel}</p>
                            {tx.orderId && <p className="text-[10px] text-slate-400 font-mono mt-1">{tx.orderId.slice(0, 8)}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5">Description</th>
                        <th className="px-4 py-2.5">Store</th>
                        <th className="px-4 py-2.5 text-right">Amount</th>
                        <th className="px-4 py-2.5 text-right">Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {items.map((tx) => {
                        const isCredit = tx.amount >= 0;
                        const amountLabel = `${isCredit ? '+' : '-'}${formatCurrency(Math.abs(tx.amount))}`;
                        return (
                          <tr key={tx.id} className="text-[11px] text-slate-700 hover:bg-slate-50/50">
                            <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                              {new Date(tx.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-xs truncate text-slate-700">{tx.label || '—'}</td>
                            <td className="px-4 py-3 max-w-[140px] truncate text-slate-500">{tx.storeName || '—'}</td>
                            <td className={`px-4 py-3 text-right font-semibold tabular-nums ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {amountLabel}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-400">
                              {tx.orderId ? tx.orderId.slice(0, 8) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
              <span>Page {page} of {Math.max(1, Math.ceil(total / pageSize) || 1)}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!hasPrev || loading}
                  onClick={() => hasPrev && setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12"><path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!hasNext || loading}
                  onClick={() => hasNext && setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  Next
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12"><path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

      </div>
    </DashboardLayout>
  );
}