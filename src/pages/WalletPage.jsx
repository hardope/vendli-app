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
  searchPayoutBanks,
  resolvePayoutAccount,
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

function PayoutModal({ balance, payoutMethods, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState(() => {
    const active = payoutMethods.find((m) => m.status === 'ACTIVE');
    return active ? active.id : '';
  });
  const [submitting, setSubmitting] = useState(false);

  const numericAmount = Number(amount);
  const selectedMethod = payoutMethods.find((m) => m.id === methodId);
  const isValid = !Number.isNaN(numericAmount) && numericAmount > 0 && numericAmount <= balance && methodId;
  const pct = balance > 0 ? Math.min(100, (numericAmount / balance) * 100) : 0;

  function handleQuickAmount(value) {
    setAmount(String(Math.floor(value)));
  }

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await createPayoutRequest({ payoutMethodId: methodId, amount: numericAmount });
      Notify.success("Payout request submitted. We'll process it shortly.");
      onSuccess();
    } catch {
      Notify.error('Could not submit the payout request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(15,23,42,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Withdraw</p>
            <p className="text-base font-semibold text-slate-900">Request a payout</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <div className="px-5 py-5 space-y-5">
          {/* Balance pill */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 mb-0.5">Available balance</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{formatCurrency(balance)}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 16 16">
                <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M1 7h14" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="4.5" cy="10" r="0.8" fill="currentColor"/>
              </svg>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">Amount to withdraw</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400 pointer-events-none select-none">₦</span>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 py-3 text-xl font-bold text-slate-900 tabular-nums placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
              />
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-200 ${numericAmount > balance ? 'bg-rose-400' : 'bg-emerald-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2">
              {[0.25, 0.5, 0.75, 1].map((frac) => (
                <button
                  key={frac}
                  type="button"
                  onClick={() => handleQuickAmount(balance * frac)}
                  className="flex-1 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  {frac === 1 ? 'Max' : `${frac * 100}%`}
                </button>
              ))}
            </div>

            {numericAmount > balance && (
              <p className="text-[11px] text-rose-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 4v2.5M6 8.5h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                Amount exceeds your available balance
              </p>
            )}
          </div>

          {/* To account */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">To account</label>
            <div className="space-y-2">
              {payoutMethods.filter((m) => m.status === 'ACTIVE').map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethodId(m.id)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                    methodId === m.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{m.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{m.details?.bankName} · ····{m.details?.accountNumber?.slice(-4)}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      methodId === m.id ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                    }`}>
                      {methodId === m.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-5 pb-5 pt-2 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-slate-200 text-sm text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isValid || submitting}
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30" strokeDashoffset="10"/></svg>
                Submitting…
              </>
            ) : (
              <>
                Withdraw {isValid ? formatCurrency(numericAmount) : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddAccountModal({ onClose, onSuccess }) {
  const [step, setStep] = useState('details');
  const [method, setMethod] = useState(EMPTY_METHOD);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const [bankQuery, setBankQuery] = useState('');
  const [bankOptions, setBankOptions] = useState([]);
  const [searchingBanks, setSearchingBanks] = useState(false);
  const [resolvingName, setResolvingName] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [payoutMethodId, setPayoutMethodId] = useState('');

  useEffect(() => {
    let cancelled = false;
    const normalizedQuery = bankQuery.trim().toLowerCase();
    const selectedBankName = (method.bankName ?? '').trim().toLowerCase();

    if (!normalizedQuery) {
      setBankOptions([]);
      return () => {
        cancelled = true;
      };
    }

    if (method.bankCode && normalizedQuery === selectedBankName) {
      setBankOptions([]);
      return () => {
        cancelled = true;
      };
    }

    if (normalizedQuery.length < 2) {
      setBankOptions([]);
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(async () => {
      setSearchingBanks(true);
      try {
        const data = await searchPayoutBanks(bankQuery.trim(), { limit: 20 });
        if (!cancelled) {
          setBankOptions(Array.isArray(data?.banks) ? data.banks : []);
        }
      } catch {
        if (!cancelled) {
          setBankOptions([]);
        }
      } finally {
        if (!cancelled) {
          setSearchingBanks(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bankQuery, method.bankCode, method.bankName]);

  useEffect(() => {
    let cancelled = false;

    if (!method.bankCode || method.accountNumber.length !== 10) {
      setResolvingName(false);
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(async () => {
      setResolvingName(true);
      try {
        const data = await resolvePayoutAccount({
          bankCode: method.bankCode,
          accountNumber: method.accountNumber,
        });

        if (cancelled) {
          return;
        }

        setMethod((prev) => ({
          ...prev,
          bankName: data.bankName,
          bankCode: data.bankCode,
          accountName: data.accountName,
          accountNumber: data.accountNumber,
        }));
        setBankQuery(data.bankName);
        setResolved(true);
      } catch {
        if (!cancelled) {
          setResolved(false);
          setMethod((prev) => ({ ...prev, accountName: '' }));
        }
      } finally {
        if (!cancelled) {
          setResolvingName(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [method.bankCode, method.accountNumber]);

  const isAccountNumberValid = /^\d{10}$/.test(method.accountNumber);
  const isDetailsValid = method.bankCode && method.bankName && method.accountName && isAccountNumberValid;

  function resolveLabel(payload) {
    const nickname = payload.label?.trim();
    if (nickname) return nickname;
    return `${payload.accountName} - ${payload.bankName}`;
  }

  async function handleContinue() {
    setLoading(true);
    try {
      const normalizedMethod = {
        bankCode: method.bankCode,
        bankName: method.bankName,
        accountNumber: method.accountNumber,
        accountName: method.accountName,
        label: resolveLabel(method),
      };
      const result = await startCreatePayoutMethod(normalizedMethod);
      setPayoutMethodId(result?.payoutMethodId || '');
      setMethod(normalizedMethod);
      setStep('otp');
    } catch {
      Notify.error('Could not save bank details. Please check and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!payoutMethodId) {
      Notify.error('Missing payout method reference. Please restart account setup.');
      return;
    }

    setLoading(true);
    try {
      await confirmPayoutMethod({ payoutMethodId, otp: otpCode });
      Notify.success('Bank account added successfully.');
      onSuccess();
    } catch {
      Notify.error('Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(15,23,42,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {step === 'otp' && (
              <button
                type="button"
                onClick={() => { setStep('details'); setOtpCode(''); }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Back"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                {step === 'details' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </p>
              <p className="text-base font-semibold text-slate-900">
                {step === 'details' ? 'Add bank account' : 'Verify your email'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex h-1">
          <div className="flex-1 bg-slate-900 transition-all" />
          <div className={`flex-1 transition-all ${step === 'otp' ? 'bg-slate-900' : 'bg-slate-100'}`} />
        </div>

        {/* Details step */}
        {step === 'details' && (
          <>
            <div className="px-5 py-5 space-y-3">
              <div className="relative">
                <label className="block text-xs font-medium text-slate-700 mb-1">Bank name</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300"
                  placeholder="Search bank name"
                  value={bankQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBankQuery(value);
                    setResolved(false);
                    setMethod((m) => ({ ...m, bankName: value, bankCode: '', accountName: '' }));
                  }}
                />

                {(searchingBanks || bankOptions.length > 0) && (
                  <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {searchingBanks && <div className="px-3 py-2 text-xs text-slate-500">Searching banks...</div>}
                    {!searchingBanks && bankOptions.map((bank) => (
                      <button
                        key={`${bank.code}-${bank.id}`}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setBankQuery(bank.name);
                          setMethod((m) => ({
                            ...m,
                            bankName: bank.name,
                            bankCode: bank.code,
                            accountName: '',
                          }));
                          setBankOptions([]);
                          setResolved(false);
                        }}
                      >
                        {bank.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Account number</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300"
                  placeholder="0123456789"
                  inputMode="numeric"
                  value={method.accountNumber}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setResolved(false);
                    setResolvingName(false);
                    setMethod((m) => ({ ...m, accountNumber: next, accountName: '' }));
                  }}
                />
              </div>

              {(resolvingName || resolved) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] text-slate-500 mb-1">Account name</p>
                  {resolvingName ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30" strokeDashoffset="10"/></svg>
                      Resolving account name…
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-slate-800">{method.accountName}</p>
                  )}
                </div>
              )}

              {resolved && method.accountName && (
                <p className="text-[11px] text-emerald-600">Account verified. You can continue.</p>
              )}
            </div>
            <div className="px-5 pb-5 pt-2 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full border border-slate-200 text-sm text-slate-600 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isDetailsValid || loading}
                onClick={handleContinue}
                className="flex-1 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30" strokeDashoffset="10"/></svg>
                    Saving…
                  </>
                ) : 'Continue'}
              </button>
            </div>
          </>
        )}

        {/* OTP step */}
        {step === 'otp' && (
          <>
            <div className="px-5 py-5 space-y-5">
              <p className="text-sm text-slate-500 leading-relaxed">
                We sent a 6-digit verification code to the email on your Vendli account. Enter it below to confirm <span className="font-medium text-slate-700">{method.label || 'this account'}</span>.
              </p>

              {/* OTP boxes */}
              <div>
                <div className="flex items-center gap-2 mb-2" onClick={() => document.getElementById('otp-input-modal')?.focus()}>
                  {[0,1,2,3,4,5].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 h-12 rounded-xl border-2 flex items-center justify-center text-lg font-bold cursor-text transition-colors ${
                        otpCode[i]
                          ? 'border-slate-900 bg-white text-slate-900'
                          : i === otpCode.length
                          ? 'border-slate-400 bg-slate-50 text-slate-300'
                          : 'border-slate-200 bg-white text-slate-200'
                      }`}
                    >
                      {otpCode[i] || '·'}
                    </div>
                  ))}
                </div>
                <input
                  id="otp-input-modal"
                  className="sr-only"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  autoFocus
                  inputMode="numeric"
                  aria-label="Verification code"
                />
                <p className="text-[11px] text-slate-400">Tap the boxes to enter your code</p>
              </div>

              {/* Account summary */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[11px] text-slate-400 mb-1">Adding account</p>
                <p className="text-sm font-medium text-slate-800">{method.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{method.bankName} · {method.accountNumber}</p>
              </div>
            </div>

            <div className="px-5 pb-5 pt-2 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full border border-slate-200 text-sm text-slate-600 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={otpCode.length !== 6 || loading}
                onClick={handleVerify}
                className="flex-1 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30" strokeDashoffset="10"/></svg>
                    Verifying…
                  </>
                ) : 'Verify & add account'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

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
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);

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
  const pendingPayoutRequests = payoutRequests.filter((p) => p.status === 'PENDING');
  const hasPendingRequest = pendingPayoutRequests.length > 0;

  async function handleAddAccountSuccess() {
    const [methods, requests] = await Promise.all([fetchPayoutMethods(), fetchPayoutRequests()]);
    setPayoutMethods(methods ?? []);
    setPayoutRequests(requests ?? []);
    setAddAccountOpen(false);
  }

  async function handlePayoutSuccess() {
    const [data, requests] = await Promise.all([fetchWallet(page, pageSize), fetchPayoutRequests()]);
    setWallet(data);
    setWalletBalance(data.balance ?? 0);
    setPayoutRequests(requests ?? []);
    setPayoutModalOpen(false);
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
                  onClick={() => setPayoutModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M8 2v9M4 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Withdraw funds
                </button>
                <button
                  type="button"
                  onClick={() => setAddAccountOpen(true)}
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
                onClick={() => setAddAccountOpen(true)}
                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Add account
              </button>
            }
          />

          <div className="p-5 space-y-4">

            {/* Methods list */}
            {payoutMethods.length === 0 && (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 20 20"><rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 9h16" stroke="currentColor" strokeWidth="1.5"/></svg>
                </div>
                <p className="text-sm font-medium text-slate-600">No bank accounts yet</p>
                <p className="text-xs text-slate-400 mt-1">Add an account to start withdrawing your earnings</p>
                <button
                  type="button"
                  onClick={() => setAddAccountOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Add bank account
                </button>
              </div>
            )}

            {payoutMethods.length > 0 && (
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
        {hasPendingRequest && (
        <SectionCard>
          <SectionHeader
            label="Withdrawals"
            title="Payout requests"
            action={
              <button
                type="button"
                disabled={!activeMethod || hasPendingRequest || balance <= 0}
                onClick={() => setPayoutModalOpen(true)}
                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                Request payout
              </button>
            }
          />

          <div className="p-5 space-y-4">
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
                    {pendingPayoutRequests.map((p) => (
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
          </div>
        </SectionCard>
        )}

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

        {addAccountOpen && (
          <AddAccountModal
            onClose={() => setAddAccountOpen(false)}
            onSuccess={handleAddAccountSuccess}
          />
        )}

        {payoutModalOpen && (
          <PayoutModal
            balance={balance}
            payoutMethods={payoutMethods}
            onClose={() => setPayoutModalOpen(false)}
            onSuccess={handlePayoutSuccess}
          />
        )}

      </div>
    </DashboardLayout>
  );
}