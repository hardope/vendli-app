"use client";

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { updateStore, activateStore, deactivateStore } from '../services/store.service.js';
import { uploadFile } from '../services/files.service.js';
import Notify from '../components/Notify.js';
import BrandColorPicker from '../components/BrandColorPicker.jsx';
import PhoneNumberInput from '../components/PhoneNumberInput.jsx';

function SectionCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ label, title, action }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-slate-100">
      <div>
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
      </div>
      {action}
    </div>
  );
}

export default function StorefrontSettingsPage() {
  const { stores, currentStoreId, setCurrentStoreId, setStores } = useStoreStore();

  const [form, setForm] = useState({
    name: '',
    description: '',
    brandColor: '',
    brandAccentColor: '',
    bannerImage: '',
    logo: '',
    contactEmail: '',
    contactWhatsapp: '',
    contactWhatsappCountryCode: '234',
    contactWhatsappLocal: '',
    contactLocation: '',
    contactAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [confirmingStatus, setConfirmingStatus] = useState(null); // 'activate' | 'deactivate' | null

  const currentStore = useMemo(
    () => stores.find((s) => s.id === currentStoreId) || stores[0] || null,
    [stores, currentStoreId],
  );

  const storefrontUrl = useMemo(() => {
    if (!currentStore) return '';
    const base = import.meta.env.VITE_STOREFRONT_BASE_URL || window.location.host;
    return `${currentStore.slug}.${base}`;
  }, [currentStore]);

  const handleCopyStorefrontUrl = async () => {
    if (!storefrontUrl) return;
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      Notify.success('Store link copied to clipboard');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      Notify.error('We could not copy your store link. Please try again.');
    }
  };

  useEffect(() => {
    if (!currentStore && stores.length > 0 && !currentStoreId) {
      setCurrentStoreId(stores[0].id);
    }
  }, [currentStore, stores, currentStoreId, setCurrentStoreId]);

  useEffect(() => {
    if (!currentStore) return;
    const existingWhatsapp = currentStore.contactWhatsapp || '';
    const existingWhatsappDigits = existingWhatsapp.replace(/\D/g, '');
    let contactWhatsappCountryCode = '234';
    let contactWhatsappLocal = '';

    if (existingWhatsappDigits) {
      if (existingWhatsappDigits.startsWith('234')) {
        contactWhatsappCountryCode = '234';
        contactWhatsappLocal = existingWhatsappDigits.slice(3);
      } else {
        contactWhatsappLocal = existingWhatsappDigits;
      }
    }

    setForm({
      name: currentStore.name || '',
      description: currentStore.description || '',
      brandColor: currentStore.brandColor || '',
      brandAccentColor: currentStore.brandAccentColor || '',
      bannerImage: currentStore.bannerImage || '',
      logo: currentStore.logo || '',
      contactEmail: currentStore.contactEmail || '',
      contactWhatsapp: currentStore.contactWhatsapp || '',
      contactWhatsappCountryCode,
      contactWhatsappLocal,
      contactLocation: currentStore.contactLocation || '',
      contactAddress: currentStore.contactAddress || '',
    });
  }, [currentStore]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !currentStore) return;
    setLoading(true);
    try {
      setUploadingLogo(true);
      const uploaded = await uploadFile(file);
      setForm((prev) => ({ ...prev, logo: uploaded.url }));
      Notify.success('Logo uploaded.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      Notify.error('We could not upload your logo. Please try again.');
    } finally {
      setUploadingLogo(false);
      setLoading(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !currentStore) return;
    setLoading(true);
    try {
      setUploadingBanner(true);
      const uploaded = await uploadFile(file);
      setForm((prev) => ({ ...prev, bannerImage: uploaded.url }));
      Notify.success('Banner image uploaded.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      Notify.error('We could not upload your banner. Please try again.');
    } finally {
      setUploadingBanner(false);
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    if (!currentStore) return;
    setSaving(true);
    try {
      const contactWhatsapp = form.contactWhatsappLocal
        ? `${(form.contactWhatsappCountryCode || '234').trim()}${form.contactWhatsappLocal.trim()}`
        : undefined;

      const updated = await updateStore(currentStore.id, {
        name: form.name || undefined,
        description: form.description || undefined,
        brandColor: form.brandColor || undefined,
        brandAccentColor: form.brandAccentColor || undefined,
        bannerImage: form.bannerImage || undefined,
        logo: form.logo || undefined,
        contactEmail: form.contactEmail || undefined,
        contactWhatsapp,
        contactLocation: form.contactLocation || undefined,
        contactAddress: form.contactAddress || undefined,
      });
      const nextStores = stores.map((s) => (s.id === updated.id ? updated : s));
      setStores(nextStores);
      Notify.success('Storefront settings updated. Your storefront will reflect these changes.');
      setConfirming(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      Notify.error('We could not save your storefront settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentStore) return;

    if (!confirming) {
      setConfirming(true);
      return;
    }

    await saveChanges();
  };

  const handleCancelConfirm = () => {
    setConfirming(false);
  };

  const handleRequestToggleStatus = (action) => {
    setConfirmingStatus(action);
  };

  const handleCancelToggleStatus = () => {
    setConfirmingStatus(null);
  };

  const handleConfirmToggleStatus = async () => {
    if (!currentStore || !confirmingStatus) return;
    const nextActive = confirmingStatus === 'activate';
    try {
      setTogglingStatus(true);
      const updated = nextActive
        ? await activateStore(currentStore.id)
        : await deactivateStore(currentStore.id);
      const nextStores = stores.map((s) => (s.id === updated.id ? updated : s));
      setStores(nextStores);
      Notify.success(nextActive ? 'Store activated. Buyers can see your storefront again.' : 'Store deactivated. Buyers can no longer access this storefront.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      Notify.error('We could not update your store status. Please try again.');
    } finally {
      setTogglingStatus(false);
      setConfirmingStatus(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Storefront</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage how your store appears to buyers. Changes go live after you save and confirm.
          </p>
        </div>

        {!currentStore && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm text-slate-500">
            Pick or create a store from the sidebar first to manage its settings.
          </div>
        )}

        {currentStore && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)] items-start">

            {/* ── Left column: form ── */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Identity card */}
              <SectionCard>
                <SectionHeader label="Store" title="Identity & branding" />
                <div className="p-5 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5" htmlFor="name">Store name</label>
                      <input
                        id="name" name="name" type="text"
                        value={form.name} onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5" htmlFor="description">Short description</label>
                      <textarea
                        id="description" name="description" rows={3}
                        value={form.description} onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:bg-white transition-colors resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <BrandColorPicker
                      id="brandColor" label="Brand color"
                      value={form.brandColor} defaultSwatch="#111827"
                      onChange={(hex) => setForm((prev) => ({ ...prev, brandColor: hex }))}
                    />
                    <BrandColorPicker
                      id="brandAccentColor" label="Accent color"
                      value={form.brandAccentColor} defaultSwatch="#F97316"
                      onChange={(hex) => setForm((prev) => ({ ...prev, brandAccentColor: hex }))}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Logo upload zone */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5">Logo</p>
                      <label className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-3 py-3 cursor-pointer transition-colors ${uploadingLogo ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200 bg-slate-50 hover:border-amber-300 hover:bg-amber-50/40'}`}>
                        <div className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                          {form.logo ? (
                            <img src={form.logo} alt="Logo" className="h-full w-full object-cover" />
                          ) : (
                            <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700">
                            {uploadingLogo ? 'Uploading…' : form.logo ? 'Change logo' : 'Upload logo'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG or SVG · Square</p>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                      </label>
                    </div>

                    {/* Banner upload zone */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5">Banner image</p>
                      <label className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-3 py-3 cursor-pointer transition-colors ${uploadingBanner ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200 bg-slate-50 hover:border-amber-300 hover:bg-amber-50/40'}`}>
                        <div className="h-11 w-20 shrink-0 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                          {form.bannerImage ? (
                            <img src={form.bannerImage} alt="Banner" className="h-full w-full object-cover" />
                          ) : (
                            <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700">
                            {uploadingBanner ? 'Uploading…' : form.bannerImage ? 'Change banner' : 'Upload banner'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">PNG or JPG · Wide format</p>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploadingBanner} />
                      </label>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Contact card */}
              <SectionCard>
                <SectionHeader label="Visibility" title="Contact & location" />
                <div className="p-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5" htmlFor="contactEmail">Contact email</label>
                      <input
                        id="contactEmail" name="contactEmail" type="email"
                        value={form.contactEmail} onChange={handleChange}
                        placeholder="support@yourstore.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">WhatsApp number</label>
                      <div className="flex gap-2">
                        <div className="relative w-20 shrink-0">
                          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-[11px] text-slate-400">+</span>
                          <PhoneNumberInput
                            id="contactWhatsappCountryCode" name="contactWhatsappCountryCode" segment="countryCode"
                            value={form.contactWhatsappCountryCode}
                            onChange={(nextValue) => setForm((prev) => ({ ...prev, contactWhatsappCountryCode: nextValue }))}
                            placeholder="234"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-6 pr-2 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:bg-white transition-colors"
                          />
                        </div>
                        <PhoneNumberInput
                          id="contactWhatsappLocal" name="contactWhatsappLocal" segment="local"
                          value={form.contactWhatsappLocal}
                          onChange={(nextValue) => setForm((prev) => ({ ...prev, contactWhatsappLocal: nextValue }))}
                          placeholder="8012345678"
                          className="flex-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:bg-white transition-colors"
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">Shown to buyers on your live storefront.</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5" htmlFor="contactLocation">Location</label>
                      <input
                        id="contactLocation" name="contactLocation" type="text"
                        value={form.contactLocation} onChange={handleChange}
                        placeholder="Lagos, Nigeria"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5" htmlFor="contactAddress">Address</label>
                      <textarea
                        id="contactAddress" name="contactAddress" rows={2}
                        value={form.contactAddress} onChange={handleChange}
                        placeholder="Street, area, city"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:bg-white transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Save actions */}
              <div className="space-y-3">
                {confirming && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                    <p className="text-sm font-semibold text-amber-900 mb-0.5">Confirm changes to {currentStore.name}</p>
                    <p className="text-[13px] text-amber-800">These changes will update your live storefront immediately.</p>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving || loading}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving…' : confirming ? 'Confirm and save' : 'Save changes'}
                  </button>
                  {confirming && (
                    <button type="button" onClick={handleCancelConfirm} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* ── Right column: status + preview ── */}
            <div className="space-y-5">

              {/* Status card */}
              <SectionCard>
                <SectionHeader
                  label="Store"
                  title="Visibility"
                  action={
                    !confirmingStatus ? (
                      <button
                        type="button"
                        onClick={() => handleRequestToggleStatus(currentStore.isActive !== false ? 'deactivate' : 'activate')}
                        disabled={togglingStatus}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                      >
                        {togglingStatus ? 'Updating…' : currentStore.isActive !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    ) : null
                  }
                />
                <div className="p-5 space-y-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${currentStore.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${currentStore.isActive !== false ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                    {currentStore.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    {currentStore.isActive !== false
                      ? 'Your storefront is live. Buyers can view your products and place orders.'
                      : 'Your storefront is hidden. Activate it to start receiving orders.'}
                  </p>
                  {confirmingStatus && (
                    <div className="rounded-xl border border-rose-100 bg-rose-50 p-3.5 space-y-2.5">
                      <p className="text-xs font-semibold text-rose-900">
                        {confirmingStatus === 'deactivate' ? 'Deactivate this store?' : 'Activate this store?'}
                      </p>
                      <p className="text-[11px] text-rose-700 leading-relaxed">
                        {confirmingStatus === 'deactivate'
                          ? 'Buyers will not be able to view or order from this storefront until you reactivate it.'
                          : 'This store will become visible to buyers on your storefront URL.'}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={handleConfirmToggleStatus}
                          disabled={togglingStatus}
                          className="inline-flex items-center justify-center rounded-full bg-rose-500 text-white px-3 py-1.5 text-xs font-semibold hover:bg-rose-600 disabled:opacity-60 transition-colors"
                        >
                          {togglingStatus ? 'Updating…' : confirmingStatus === 'deactivate' ? 'Yes, deactivate' : 'Yes, activate'}
                        </button>
                        <button type="button" onClick={handleCancelToggleStatus} className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Preview card */}
              <SectionCard>
                <SectionHeader label="Preview" title="Storefront" />
                <div className="p-5 space-y-3">
                  {/* Dark hero — matches actual StorefrontHeader */}
                  <div
                    className="rounded-2xl overflow-hidden border border-slate-800"
                    style={{
                      background: form.bannerImage
                        ? `linear-gradient(to bottom, rgba(15,23,42,0.45), rgba(15,23,42,0.88)), url(${form.bannerImage}) center/cover no-repeat`
                        : `linear-gradient(135deg, ${form.brandColor || '#111827'}28 0%, #0f172a 100%)`,
                      backgroundColor: '#0f172a',
                    }}
                  >
                    <div className="px-4 pt-4 pb-3 space-y-3">
                      {/* Logo + name row */}
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 rounded-xl border border-slate-700/70 bg-slate-900/80 flex items-center justify-center overflow-hidden">
                          {form.logo ? (
                            <img src={form.logo} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-base font-semibold text-slate-300">
                              {(form.name || currentStore.name)?.[0]?.toUpperCase() ?? 'S'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-0.5">Curated by</p>
                          <p className="text-sm font-semibold text-white truncate">{form.name || currentStore.name}</p>
                          {form.description && (
                            <p className="text-[10px] text-slate-300/80 mt-0.5 line-clamp-1">{form.description}</p>
                          )}
                        </div>
                      </div>
                      {/* Bottom row */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[9px] text-slate-500 truncate max-w-32">{storefrontUrl}</p>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-900/60 px-2 py-0.5">
                          <span
                            className="h-1 w-4 rounded-full"
                            style={{ backgroundImage: `linear-gradient(90deg, ${form.brandAccentColor || '#F97316'}, ${form.brandColor || '#111827'})` }}
                          />
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-medium">Vendli</span>
                        </div>
                      </div>
                    </div>
                    {/* Brand color strip */}
                    <div
                      className="h-1 w-full"
                      style={{ backgroundImage: `linear-gradient(90deg, ${form.brandColor || '#111827'}, ${form.brandAccentColor || '#F97316'})` }}
                    />
                  </div>

                  {/* Storefront URL row */}
                  {storefrontUrl && (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="flex-1 text-[11px] text-slate-500 truncate">{storefrontUrl}</p>
                      <button
                        type="button"
                        onClick={handleCopyStorefrontUrl}
                        className="shrink-0 text-[10px] font-semibold text-amber-700 hover:text-amber-900 transition-colors"
                      >
                        Copy link
                      </button>
                    </div>
                  )}
                </div>
              </SectionCard>

            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
