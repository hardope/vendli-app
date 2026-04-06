"use client";

import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store.js';
import { useStoreStore } from '../store/store.store.js';
import Loader from './Loader.jsx';
import { fetchMyStores } from '../services/store.service.js';
import { LayoutDashboard, Boxes, Palette } from 'lucide-react';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.user);
  const { stores, currentStoreId, setCurrentStoreId, setStores } = useStoreStore();

  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [copyState, setCopyState] = useState('Copy');
  const [storesLoading, setStoresLoading] = useState(false);

  const currentStore = useMemo(
    () => stores.find((s) => s.id === currentStoreId) || stores[0] || null,
    [stores, currentStoreId],
  );

  useEffect(() => {
    if (!currentStore && stores.length > 0) {
      setCurrentStoreId(stores[0].id);
    }
  }, [currentStore, stores, setCurrentStoreId]);

  useEffect(() => {
    let cancelled = false;

    async function loadStores() {
      if (storesLoading || stores.length > 0) return;

      setStoresLoading(true);
      try {
        const data = await fetchMyStores();
        // if (cancelled) return;

        const items = data.items || [];
        setStores(items);

        if (!currentStoreId && items.length > 0) {
          const preferred = items.find((s) => s.isDefault) || items[0];
          if (preferred) {
            setCurrentStoreId(preferred.id);
          }
        }
      } catch {
        // silently ignore store load errors here; pages can handle lack of stores
      } finally {
        if (!cancelled) {
          setStoresLoading(false);
        }
      }
    }

    loadStores();


    return () => {
      cancelled = true;
    };
  }, [storesLoading, stores.length, currentStoreId, setStores, setCurrentStoreId]);

  const handleLogout = () => {
    signOut();
    navigate('/auth');
  };

  const handleStoreSelect = (id) => {
    setCurrentStoreId(id);
    setStoreMenuOpen(false);
  };

  const storefrontUrl = currentStore
    ? (() => {
        const base = import.meta.env.VITE_STOREFRONT_APP_URL || window.location.origin;
        try {
          const url = new URL(base);
          url.searchParams.set('store', currentStore.slug);
          return url.toString();
        } catch {
          return `${base}?store=${encodeURIComponent(currentStore.slug)}`;
        }
      })()
    : '';

  const handleCopyStorefrontUrl = async () => {
    if (!storefrontUrl) return;
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      setCopyState('Copied');
      setTimeout(() => setCopyState('Copy'), 1500);
    } catch {
      setCopyState('Error');
      setTimeout(() => setCopyState('Copy'), 1500);
    }
  };

  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/products', label: 'Products', icon: Boxes },
    { to: '/storefront-settings', label: 'Storefront', icon: Palette },
  ];

  if (storesLoading && stores.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="px-4 py-4 flex items-center gap-2 border-b border-slate-100">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center">
              <div className="h-4 w-4 rounded-lg bg-gradient-to-tr from-amber-400 to-orange-500" />
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">Vendly</span>
          </Link>
        </div>
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[11px] font-medium text-slate-500 mb-1">Active store</p>
          {currentStore ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setStoreMenuOpen((v) => !v)}
                className="w-full inline-flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 hover:border-amber-400/70 hover:bg-white transition-colors"
              >
                <span className="truncate mr-2">{currentStore.name || 'Untitled store'}</span>
                <span className="text-[9px] text-slate-500">Switch ▾</span>
              </button>
              {storeMenuOpen && (
                <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl py-1 text-xs text-slate-800">
                  {stores.map((store) => (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => handleStoreSelect(store.id)}
                      className={classNames(
                        'w-full flex items-center justify-between px-3 py-1.5 hover:bg-amber-50 text-left',
                        store.id === currentStore.id && 'bg-amber-50/70 text-amber-900',
                      )}
                    >
                      <span className="truncate mr-2">{store.name || 'Untitled store'}</span>
                      {store.id === currentStore.id && (
                        <span className="text-[9px] text-amber-700 font-medium">Active</span>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setStoreMenuOpen(false);
                      navigate('/onboarding');
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 text-left border-t border-slate-100 text-[11px] text-slate-600"
                  >
                    <span>Create new store</span>
                    <span className="text-slate-400 text-[10px]">＋</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="w-full inline-flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 hover:border-amber-400 hover:text-amber-800 hover:bg-amber-50 transition-colors"
            >
              Create a store
            </button>
          )}
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                classNames(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium',
                  isActive
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )
              }
            >
              <span className="text-sm leading-none">
                <item.icon className="h-4 w-4" />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="truncate mr-2">{user?.email}</span>
          <span className="text-[10px] text-slate-400">Signed in</span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/90 border-b border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:hidden">
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-lg bg-gradient-to-tr from-amber-400 to-orange-500" />
                </div>
                <span className="text-base font-semibold tracking-tight text-slate-900">Vendly</span>
              </Link>
            </div>
            <div className="flex-1 flex flex-wrap items-center gap-3 min-w-0">
              {currentStore && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-700 truncate">
                    <span className="font-medium mr-1">Storefront</span>
                    <span className="truncate max-w-[10rem] align-middle text-slate-500">{storefrontUrl}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyStorefrontUrl}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors whitespace-nowrap"
                  >
                    {copyState}
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] text-slate-700 whitespace-nowrap">
                <span className="mr-1 text-slate-400">Wallet</span>
                <span className="font-semibold text-slate-900">₦0</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="h-8 w-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-[14px] text-slate-600 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                aria-label="Log out"
              >
                ⎋
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-[12px] font-semibold text-slate-700"
              >
                {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 bg-slate-50 px-4 sm:px-6 py-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
