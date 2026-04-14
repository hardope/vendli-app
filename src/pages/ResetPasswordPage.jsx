"use client";

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/auth.service.js';
import Notify from '../components/Notify.js';

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const search = new URLSearchParams(location.search);
  const initialEmail = search.get('email') || '';
  const initialToken = search.get('token') || '';

  const [form, setForm] = useState({
    email: initialEmail,
    token: initialToken,
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.token.trim()) {
      Notify.error('Enter the reset code from your email.');
      return;
    }

    if (!form.password || form.password.length < 8) {
      Notify.error('New password must be at least 8 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      Notify.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        token: form.token.trim(),
        password: form.password,
        email: form.email || undefined,
      });

      Notify.success('Password reset successfully. You can now sign in.');
      navigate('/auth');
    } catch (error) {
      console.error(error);
      Notify.error('Reset code is invalid or expired. Request a new email and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-xl w-full grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-xs font-medium mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Seller workspace
          </span>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Reset your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400">
              Vendli password.
            </span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-md">
            Enter the email you use to sign in, the reset code from your email, and choose a new password.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-amber-200/60 via-sky-200/40 to-fuchsia-200/60 blur-2xl" />
          <div className="relative rounded-3xl border border-slate-200 bg-white/95 backdrop-blur-xl p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@yourbrand.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="token">
                  Reset code
                </label>
                <input
                  id="token"
                  name="token"
                  type="text"
                  value={form.token}
                  onChange={handleChange}
                  required
                  placeholder="Paste the code or open this link from your email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  If you clicked the button in your email, this field may already be filled in.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="password">
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Choose a strong password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="confirmPassword">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Repeat your new password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center rounded-full bg-amber-400 text-slate-950 text-sm font-semibold py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-60"
              >
                {loading ? 'Resetting…' : 'Reset password'}
              </button>

              <p className="text-[11px] text-slate-500 text-center mt-2">
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="text-amber-700 hover:underline"
                >
                  Back to sign in
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
