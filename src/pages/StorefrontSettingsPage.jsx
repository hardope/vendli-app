"use client";

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { updateStore } from '../services/store.service.js';
import { uploadFile } from '../services/files.service.js';
import Notify from '../components/Notify.js';
import BrandColorPicker from '../components/BrandColorPicker.jsx';

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
    let contactWhatsappCountryCode = '234';
    let contactWhatsappLocal = '';

    if (existingWhatsapp) {
      if (existingWhatsapp.startsWith('234')) {
        contactWhatsappCountryCode = '234';
        contactWhatsappLocal = existingWhatsapp.slice(3);
      } else {
        contactWhatsappLocal = existingWhatsapp;
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
      const uploaded = await uploadFile(file);
      setForm((prev) => ({ ...prev, logo: uploaded.url }));
      Notify.success('Logo uploaded.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      Notify.error('We could not upload your logo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !currentStore) return;
    setLoading(true);
    try {
      const uploaded = await uploadFile(file);
      setForm((prev) => ({ ...prev, bannerImage: uploaded.url }));
      Notify.success('Banner image uploaded.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      Notify.error('We could not upload your banner. Please try again.');
    } finally {
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

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <p className="text-xs text-slate-500">Storefront</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Storefront settings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Update how your store appears to buyers. Changes affect your live storefront, so we ask you to confirm before
            saving.
          </p>
        </div>

        {!currentStore && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Pick or create a store from the sidebar first to manage its storefront settings.
          </div>
        )}

        {currentStore && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] items-start">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="name">
                      Store name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="description">
                      Short description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={form.description}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <BrandColorPicker
                      id="brandColor"
                      label="Brand color (primary)"
                      value={form.brandColor}
                      defaultSwatch="#111827"
                      onChange={(hex) => setForm((prev) => ({ ...prev, brandColor: hex }))}
                    />
                  </div>
                  <div>
                    <BrandColorPicker
                      id="brandAccentColor"
                      label="Accent color"
                      value={form.brandAccentColor}
                      defaultSwatch="#F97316"
                      onChange={(hex) => setForm((prev) => ({ ...prev, brandAccentColor: hex }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Logo</label>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
                        {form.logo ? (
                          <img src={form.logo} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-slate-400">No logo</span>
                        )}
                      </div>
                      <label className="text-[11px] text-amber-700 cursor-pointer inline-flex items-center gap-1">
                        <span>Upload logo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Banner image</label>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-24 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
                        {form.bannerImage ? (
                          <img src={form.bannerImage} alt="Banner" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-slate-400">No banner</span>
                        )}
                      </div>
                      <label className="text-[11px] text-amber-700 cursor-pointer inline-flex items-center gap-1">
                        <span>Upload banner</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <p className="text-xs font-medium text-slate-600">Contact details</p>
                <p className="text-[11px] text-slate-500 mb-2">
                  These details show on your public storefront so buyers can reach you.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="contactEmail">
                      Contact email
                    </label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      value={form.contactEmail}
                      onChange={handleChange}
                      placeholder="support@yourstore.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="contactWhatsapp">
                      WhatsApp number
                    </label>
                    <div className="flex gap-2">
                      <div className="w-16">
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[11px] text-slate-500">
                            +
                          </span>
                          <input
                            id="contactWhatsappCountryCode"
                            name="contactWhatsappCountryCode"
                            type="text"
                            value={form.contactWhatsappCountryCode}
                            onChange={handleChange}
                            placeholder="234"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-5 pr-2 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">Code</p>
                      </div>
                      <div className="flex-1">
                        <input
                          id="contactWhatsappLocal"
                          name="contactWhatsappLocal"
                          type="text"
                          value={form.contactWhatsappLocal}
                          onChange={handleChange}
                          placeholder="8012345678"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      This is what buyers see on your live storefront.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="contactLocation">
                      Location
                    </label>
                    <input
                      id="contactLocation"
                      name="contactLocation"
                      type="text"
                      value={form.contactLocation}
                      onChange={handleChange}
                      placeholder="Lagos, Nigeria"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="contactAddress">
                      Address
                    </label>
                    <textarea
                      id="contactAddress"
                      name="contactAddress"
                      rows={2}
                      value={form.contactAddress}
                      onChange={handleChange}
                      placeholder="Street, area, city"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {confirming && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-900 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold mb-1">Confirm storefront update</p>
                      <p>
                        These changes will update your live storefront. Please confirm you want to apply them to
                        <span className="font-semibold"> {currentStore.name}</span>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelConfirm}
                      className="text-[11px] text-amber-700 hover:text-amber-900"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-full bg-amber-400 text-slate-950 text-xs font-semibold px-4 py-2 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {confirming ? 'Confirm save changes' : 'Save changes'}
                </button>
              </div>
            </form>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 text-sm text-slate-700">
              <p className="text-xs font-medium text-slate-500 mb-1">Live storefront preview</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                <div
                  className="h-16 w-full flex items-center px-4 gap-3 border-b border-slate-200"
                  style={{ background: form.bannerImage ? undefined : '#f8fafc' }}
                >
                  <div className="h-10 w-10 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                    {form.logo ? (
                      <img src={form.logo} alt="Logo preview" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Logo</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{form.name || currentStore.name}</p>
                    <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 max-w-full">
                      <span className="truncate max-w-[9rem]">{storefrontUrl}</span>
                      {storefrontUrl && (
                        <button
                          type="button"
                          onClick={handleCopyStorefrontUrl}
                          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] text-slate-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 flex-shrink-0"
                          aria-label="Copy store link"
                        >
                          ⧉
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-[12px] text-slate-600 line-clamp-2">
                    {form.description || 'Your store description will show here.'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border"
                      style={{
                        backgroundColor: form.brandColor || '#111827',
                        borderColor: form.brandColor || '#111827',
                        color: '#f9fafb',
                      }}
                    >
                      Primary
                    </span>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border"
                      style={{
                        backgroundColor: form.brandAccentColor || '#F97316',
                        borderColor: form.brandAccentColor || '#F97316',
                        color: '#111827',
                      }}
                    >
                      Accent
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
