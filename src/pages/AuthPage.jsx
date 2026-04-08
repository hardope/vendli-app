"use client";

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, getCurrentUser, verifyEmailWithOtp } from '../services/auth.service.js';
import { updateProfile } from '../services/profile.service.js';
import { LANDING_URL } from '../config.js';
import Notify from '../components/Notify.js';
import { useAuthStore } from '../store/auth.store.js';
import { useStoreStore } from '../store/store.store.js';

export default function AuthPage() {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [signupStep, setSignupStep] = useState('credentials'); // credentials | otp | profile
  const [loading, setLoading] = useState(false);
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();
  const { setTokens, setUser, redirectPath, setRedirectPath } = useAuthStore();
  const clearStores = useStoreStore((s) => s.clearStores);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login({ email: form.email, password: form.password });
      if (!data.accessToken || !data.refreshToken) {
        throw new Error('Unexpected login response');
      }
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      // New login should always reset any previously selected stores
      clearStores();
      let me = null;
      try {
        me = await getCurrentUser();
      } catch (_) {
        // ignore
      }

      const user = me?.user || null;
      const onboarding = me?.onboarding || data.onboarding || null;

      if (user) {
        setUser(user);
      }

      const pendingTasks = Array.isArray(onboarding?.pendingTasks) ? onboarding.pendingTasks : [];
      const completedTasks = Array.isArray(onboarding?.completedTasks) ? onboarding.completedTasks : [];
      const criticalPending = pendingTasks.filter((task) => task !== 'CONNECT_PAYOUT');
      const hasCompletedOnboarding = criticalPending.length === 0 && completedTasks.length > 0;

      console.log(`Pending onboarding tasks: ${pendingTasks.join(', ')}`);
      console.log(`Completed onboarding tasks: ${completedTasks.join(', ')}`);

      console.log(`Has completed onboarding: ${hasCompletedOnboarding}`);
      console.log(hasCompletedOnboarding ? '/dashboard' : '/onboarding')

      const target = hasCompletedOnboarding ? '/dashboard' : '/onboarding';
      if (redirectPath) {
        setRedirectPath(null);
      }
      Notify.success('Welcome back.');
      console.log(`target = ${target}`);
      navigate(target);
    } catch (error) {
      console.error(error);
      Notify.error('Could not sign you in. Please check your details or try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (signupStep === 'credentials') {
      if (!acceptedTerms) {
        Notify.error('Please accept the Terms & Conditions, Privacy Policy and Pricing to continue.');
        return;
      }
      setLoading(true);
      try {
        await register({ email: form.email, password: form.password });
        Notify.success('Account created. We emailed you a code to verify your address.');
        setSignupStep('otp');
      } catch (error) {
        console.error(error);
        Notify.error('We could not create your account. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (signupStep === 'otp') {
      setLoading(true);
      try {
        await verifyEmailWithOtp(form.email, form.otp ?? form.code ?? '');
        // Now log the user in using the credentials from step one
        const data = await login({ email: form.email, password: form.password });
        if (!data.accessToken || !data.refreshToken) {
          throw new Error('Unexpected login response after verification');
        }
        setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        // After signup + verification, this is effectively a fresh login; reset stores
        clearStores();
        let user = data.user;
        if (!user) {
          try {
            user = await getCurrentUser();
          } catch {
            // ignore
          }
        }
        if (user) {
          setUser(user);
        }
        Notify.success('Email verified. Tell us a bit about you.');
        setSignupStep('profile');
      } catch (error) {
        console.error(error);
        Notify.error('Verification code is invalid or expired. Try again or request a new email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (signupStep === 'profile') {
      setLoading(true);
      try {
        if (form.firstName || form.lastName) {
          await updateProfile({
            firstName: form.firstName || undefined,
            lastName: form.lastName || undefined,
          });
        }
        navigate('/onboarding');
      } catch (error) {
        console.error(error);
        Notify.error('We could not save your profile. You can update it later in settings.');
        navigate('/onboarding');
      } finally {
        setLoading(false);
      }
    }
  };

  const onSubmit = mode === 'signin' ? handleSignin : handleSignup;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-xs font-medium mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Seller workspace
          </span>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Sign in to manage
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400">
              all of your stores.
            </span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-md">
            One login for every brand you run on Vendli. Switch stores in a click, keep orders and products in sync.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-amber-200/60 via-sky-200/40 to-fuchsia-200/60 blur-2xl" />
          <div className="relative rounded-3xl border border-slate-200 bg-white/95 backdrop-blur-xl p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between mb-6">
              <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs text-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setSignupStep('credentials');
                  }}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setSignupStep('credentials');
                  }}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Create account
                </button>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === 'signin' && (
                <>
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
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="password">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showSigninPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        placeholder="Enter your password"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSigninPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-[11px] text-slate-500 hover:text-slate-700"
                        aria-label={showSigninPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSigninPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {mode === 'signup' && signupStep === 'credentials' && (
                <>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Step 1 of 3 · Account</span>
                  </div>
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
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="password">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="signup-password"
                        name="password"
                        type={showSignupPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        placeholder="Create a strong password"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-[11px] text-slate-500 hover:text-slate-700"
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignupPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500">
                    <input
                      id="accept-terms"
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                      checked={acceptedTerms}
                      onChange={(event) => setAcceptedTerms(event.target.checked)}
                      required
                    />
                    <label htmlFor="accept-terms" className="leading-snug">
                      By creating an account you agree to Vendli&apos;s{' '}
                      <a
                        href={`${LANDING_URL}/#terms`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-700 hover:underline"
                      >
                        Terms &amp; Conditions
                      </a>
                      ,{' '}
                      <a
                        href={`${LANDING_URL}/#privacy`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-700 hover:underline"
                      >
                        Privacy Policy
                      </a>{' '}
                      and{' '}
                      <a
                        href={`${LANDING_URL}/#pricing`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-700 hover:underline"
                      >
                        Pricing
                      </a>
                      .
                    </label>
                  </div>
                </>
              )}

              {mode === 'signup' && signupStep === 'otp' && (
                <>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Step 2 of 3 · Verify email</span>
                    <span className="text-slate-400">We sent a code to {form.email}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="otp">
                      Verification code
                    </label>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.otp ?? ''}
                      onChange={handleChange}
                      required
                      placeholder="6-digit code"
                      className="w-full tracking-[0.3em] text-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Or click the link in your email — both the link and this code work for verification.
                    </p>
                  </div>
                </>
              )}

              {mode === 'signup' && signupStep === 'profile' && (
                <>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Step 3 of 3 · About you</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="firstName">
                        First name
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="First name"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="lastName">
                        Last name
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="Last name"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    We&apos;ll use this on emails and around your workspace. You can change it later.
                  </p>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center rounded-full bg-amber-400 text-slate-950 text-sm font-semibold py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-60"
              >
                {loading
                  ? 'Working…'
                  : mode === 'signin'
                  ? 'Sign in'
                  : signupStep === 'credentials'
                  ? 'Continue'
                  : signupStep === 'otp'
                  ? 'Verify email'
                  : 'Continue to store setup'}
              </button>

              {mode === 'signin' && (
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  New to Vendli?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-amber-700 hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
