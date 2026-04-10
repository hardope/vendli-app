"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyStores, createStore, updateStore } from '../services/store.service.js';
import { uploadFile } from '../services/files.service.js';
import { createProduct } from '../services/product.service.js';
import { getProfile, updateProfile } from '../services/profile.service.js';
import api from '../lib/api.js';
import { useStoreStore } from '../store/store.store.js';
import Notify from '../components/Notify.js';

// Note: these helpers use HSV internally (h = 0-360, s = 0-100, l = value 0-100)
// so that the color under the picker circle matches the computed hex.
function hexFromHsl(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.min(1, Math.max(0, s / 100));
  const vv = Math.min(1, Math.max(0, l / 100));

  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hh < 60) {
    r1 = c;
    g1 = x;
  } else if (hh < 120) {
    r1 = x;
    g1 = c;
  } else if (hh < 180) {
    g1 = c;
    b1 = x;
  } else if (hh < 240) {
    g1 = x;
    b1 = c;
  } else if (hh < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const r = (r1 + m) * 255;
  const g = (g1 + m) * 255;
  const b = (b1 + m) * 255;

  const toHex = (v) => Math.round(v).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hslFromHex(hex) {
  if (!hex || typeof hex !== 'string') return { h: 24, s: 90, l: 40 };
  let value = hex.trim().replace('#', '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (value.length !== 6) return { h: 24, s: 90, l: 40 };

  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max;
  const d = max - min;

  let h = 0;
  let s = 0;

  if (d !== 0) {
    s = max === 0 ? 0 : d / max;

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360) || 0,
    s: Math.round((s || 0) * 100),
    l: Math.round(v * 100),
  };
}

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    contactEmail: '',
    contactWhatsappCountryCode: '234',
    contactWhatsappLocal: '',
    contactLocation: '',
    contactAddress: '',
  });
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '' });
  const [signupEmail, setSignupEmail] = useState('');
  const [useSignupEmailForContact, setUseSignupEmailForContact] = useState(false);
  const [step, setStep] = useState('profile'); // profile | stores | branding | product
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [brandForm, setBrandForm] = useState({ description: '', brandColor: '', brandAccentColor: '', bannerImage: '', logo: '', contactEmail: '', contactWhatsapp: '', contactLocation: '', contactAddress: '' });
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [showBrandColorPicker, setShowBrandColorPicker] = useState(false);
  const [showAccentColorPicker, setShowAccentColorPicker] = useState(false);
  const [brandColorHsl, setBrandColorHsl] = useState(() => hslFromHex('#111827'));
  const [accentColorHsl, setAccentColorHsl] = useState(() => hslFromHex('#F97316'));
  const [draggingBrandHue, setDraggingBrandHue] = useState(false);
  const [draggingAccentHue, setDraggingAccentHue] = useState(false);
  const [logoDragOver, setLogoDragOver] = useState(false);
  const [bannerDragOver, setBannerDragOver] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', stock: '', image: '', gallery: [] });
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [uploadingProductGallery, setUploadingProductGallery] = useState(false);
  const [productImageDragOver, setProductImageDragOver] = useState(false);
  const [productGalleryDragOver, setProductGalleryDragOver] = useState(false);
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const productImageInputRef = useRef(null);
  const productGalleryInputRef = useRef(null);
  const navigate = useNavigate();
  const { stores, setStores, setCurrentStoreId, currentStoreId } = useStoreStore();

  const activeStore = useMemo(() => stores.find((s) => s.id === activeStoreId) || null, [stores, activeStoreId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Get onboarding tasks to determine entry step
        const onboardingRes = await api.get('/api/onboarding/me');
        const onboarding = onboardingRes.data;
        const pending = Array.isArray(onboarding?.pendingTasks) ? onboarding.pendingTasks : [];
        const filteredPending = pending.filter((task) => task !== 'CONNECT_PAYOUT');

        // Preload profile so we can show/update names if needed
        try {
          const profile = await getProfile();
          setProfileForm({
            firstName: profile.firstName ?? '',
            lastName: profile.lastName ?? '',
          });
          if (profile.email) {
            setSignupEmail(profile.email);
          }
        } catch (_) {
          // ignore profile fetch errors
        }

        const data = await fetchMyStores();
        if (!cancelled) {
          const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
          setStores(items);

          // Decide initial step: profile first if pending, otherwise stores/branding/product based on remaining tasks
          if (filteredPending.includes('COMPLETE_PROFILE')) {
            setStep('profile');
          } else if (filteredPending.includes('CREATE_STORE')) {
            setStep('stores');
          } else if (filteredPending.includes('ADD_FIRST_PRODUCT')) {
            // When the remaining task is to add a first product, make sure
            // we have an active store selected so the product form can show.
            const defaultStore =
              items.find((s) => s.id === currentStoreId) || (items.length > 0 ? items[0] : null);

            if (defaultStore) {
              setCurrentStoreId(defaultStore.id);
              setActiveStoreId(defaultStore.id);
            }
            setStep('product');
          } else {
            setStep('stores');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError('We could not load your stores.');
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
  }, [setStores, currentStoreId, setCurrentStoreId]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await updateProfile({
        firstName: profileForm.firstName || undefined,
        lastName: profileForm.lastName || undefined,
      });
      Notify.success('Profile saved. Let’s set up your store.');
      setStep('stores');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      Notify.error('We could not save your profile. Please try again.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleUseSignupEmailForContact = () => {
    setUseSignupEmailForContact((prev) => {
      const next = !prev;
      setForm((current) => ({
        ...current,
        contactEmail: next ? signupEmail || current.contactEmail : current.contactEmail,
      }));
      return next;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const contactWhatsapp = form.contactWhatsappLocal
        ? `${(form.contactWhatsappCountryCode || '234').trim()}${form.contactWhatsappLocal.trim()}`
        : undefined;

      const created = await createStore({
        name: form.name,
        description: form.description,
        contactEmail: form.contactEmail || undefined,
        contactWhatsapp,
        contactLocation: form.contactLocation || undefined,
        contactAddress: form.contactAddress || undefined,
      });
      const nextStores = [...stores, created];
      setStores(nextStores);
      setCurrentStoreId(created.id);
      setActiveStoreId(created.id);
      setBrandForm({
        description: created.description ?? '',
        brandColor: created.brandColor ?? '',
        brandAccentColor: created.brandAccentColor ?? '',
        bannerImage: created.bannerImage ?? '',
        logo: created.logo ?? '',
        contactEmail: created.contactEmail ?? '',
        contactWhatsapp: created.contactWhatsapp ?? '',
        contactLocation: created.contactLocation ?? '',
        contactAddress: created.contactAddress ?? '',
      });
      Notify.success('Store created. Let\'s add your branding.');
      setStep('branding');
    } catch (err) {
      console.error(err);
      Notify.error('We could not create your store. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleUseExisting = (id) => {
    const selected = stores.find((s) => s.id === id) || null;
    setCurrentStoreId(id);
    setActiveStoreId(id);
    if (selected) {
      setBrandForm({
        description: selected.description ?? '',
        brandColor: selected.brandColor ?? '',
        brandAccentColor: selected.brandAccentColor ?? '',
        bannerImage: selected.bannerImage ?? '',
          logo: selected.logo ?? '',
          contactEmail: selected.contactEmail ?? '',
          contactWhatsapp: selected.contactWhatsapp ?? '',
          contactLocation: selected.contactLocation ?? '',
          contactAddress: selected.contactAddress ?? '',
      });
      if (selected.brandColor) {
        setBrandColorHsl(hslFromHex(selected.brandColor));
      }
      if (selected.brandAccentColor) {
        setAccentColorHsl(hslFromHex(selected.brandAccentColor));
      }
    }
    Notify.success('Store selected. Let\'s add your branding.');
    setStep('branding');
  };

  const handleBrandChange = (e) => {
    const { name, value } = e.target;
    setBrandForm((prev) => ({ ...prev, [name]: value }));
  };

  const processLogoFile = async (file) => {
    if (!file || !activeStoreId) return;
    setUploadingLogo(true);
    try {
      const uploaded = await uploadFile(file);
      setBrandForm((prev) => ({ ...prev, logo: uploaded.url }));
      Notify.success('Logo uploaded.');
    } catch (err) {
      console.error(err);
      Notify.error('We could not upload your logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    await processLogoFile(file);
  };

  const processBannerFile = async (file) => {
    if (!file || !activeStoreId) return;
    setUploadingBanner(true);
    try {
      const uploaded = await uploadFile(file);
      setBrandForm((prev) => ({ ...prev, bannerImage: uploaded.url }));
      Notify.success('Banner image uploaded.');
    } catch (err) {
      console.error(err);
      Notify.error('We could not upload your banner. Please try again.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    await processBannerFile(file);
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    if (!activeStoreId) return;
    setSavingBrand(true);
    try {
      const updated = await updateStore(activeStoreId, {
        description: brandForm.description || undefined,
        brandColor: brandForm.brandColor || undefined,
        brandAccentColor: brandForm.brandAccentColor || undefined,
        bannerImage: brandForm.bannerImage || undefined,
        logo: brandForm.logo || undefined,
        contactEmail: brandForm.contactEmail || undefined,
        contactWhatsapp: brandForm.contactWhatsapp || undefined,
        contactLocation: brandForm.contactLocation || undefined,
        contactAddress: brandForm.contactAddress || undefined,
      });
      const nextStores = stores.map((s) => (s.id === updated.id ? updated : s));
      setStores(nextStores);
      Notify.success('Branding saved. Let\'s add your first product.');
      setStep('product');
    } catch (err) {
      console.error(err);
      Notify.error('We could not save your branding. Please try again.');
    } finally {
      setSavingBrand(false);
    }
  };

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setProductForm((prev) => ({ ...prev, [name]: value }));
  };

  const processProductMainImageFile = async (file) => {
    if (!file || !activeStoreId) return;
    try {
      setUploadingProductImage(true);
      const uploaded = await uploadFile(file);
      setProductForm((prev) => ({ ...prev, image: uploaded.url }));
      Notify.success('Product image uploaded.');
    } catch (err) {
      console.error(err);
      Notify.error('We could not upload your product image. Please try again.');
    } finally {
      setUploadingProductImage(false);
    }
  };

  const handleProductMainImageUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    await processProductMainImageFile(file);
  };

  const processProductGalleryFile = async (file) => {
    if (!file || !activeStoreId) return;
    try {
      setUploadingProductGallery(true);
      const uploaded = await uploadFile(file);
      setProductForm((prev) => ({ ...prev, gallery: [...prev.gallery, uploaded.url] }));
      Notify.success('Gallery image added.');
    } catch (err) {
      console.error(err);
      Notify.error('We could not upload that image. Please try again.');
    } finally {
      setUploadingProductGallery(false);
    }
  };

  const handleProductGalleryUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_GALLERY_IMAGES = 5;
    const existingCount = productForm.gallery ? productForm.gallery.length : 0;
    const availableSlots = MAX_GALLERY_IMAGES - existingCount;

    if (availableSlots <= 0) {
      Notify.error(`You can only add up to ${MAX_GALLERY_IMAGES} gallery images.`);
      return;
    }

    const filesArray = Array.from(files).slice(0, availableSlots);

    if (files.length > availableSlots) {
      Notify.error(`You can only add up to ${MAX_GALLERY_IMAGES} gallery images per product.`);
    }

    // Upload sequentially to keep UI and state simple
    // eslint-disable-next-line no-restricted-syntax
    for (const file of filesArray) {
      // eslint-disable-next-line no-await-in-loop
      await processProductGalleryFile(file);
    }

    // Reset input so the same files can be re-selected if needed
    if (productGalleryInputRef.current) {
      productGalleryInputRef.current.value = '';
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!activeStoreId) return;
    setSavingProduct(true);
    try {
      const payload = {
        name: productForm.name,
        description: productForm.description || undefined,
        price: productForm.price ? Number(productForm.price) : 0,
        stock: productForm.stock ? Number(productForm.stock) : 0,
        image: productForm.image || undefined,
        gallery: productForm.gallery && productForm.gallery.length ? productForm.gallery : undefined,
      };
      await createProduct(activeStoreId, payload);
      Notify.success('Product created. You are ready to use your dashboard.');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      Notify.error('We could not create your product. Please try again.');
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 flex items-center justify-center">
      <div className="max-w-5xl w-full grid gap-10 md:grid-cols-2 items-start">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-3">
            {step === 'profile' && 'Tell us about you.'}
            {step === 'stores' && "Let'"}{step === 'stores' && 's set up your first store.'}
            {step === 'branding' && 'Add your brand details.'}
            {step === 'product' && 'Add your first product.'}
          </h1>
          <div className="flex items-center gap-2 mb-4 text-[11px] text-slate-500">
            {['profile', 'stores', 'branding', 'product'].map((key, index) => {
              const label =
                key === 'profile'
                  ? 'Profile'
                  : key === 'stores'
                  ? 'Store'
                  : key === 'branding'
                  ? 'Branding'
                  : 'Product';
              const isActive = step === key;
              const isCompleted =
                (step === 'stores' && key === 'profile') ||
                (step === 'branding' && (key === 'profile' || key === 'stores')) ||
                (step === 'product' && key !== 'product');
              return (
                <div key={key} className="flex items-center gap-1">
                  {index > 0 && <div className="h-px w-4 bg-slate-200" />}
                  <div
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition-colors ${
                      isActive
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : isCompleted
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    <span
                      className={`h-3 w-3 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isActive
                          ? 'bg-amber-400'
                          : 'bg-slate-200'
                      }`}
                    />
                    <span>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm sm:text-base text-slate-600 mb-4 max-w-md">
            {step === 'profile' &&
              'Add your name so we can personalize your workspace and emails.'}
            {step === 'stores' &&
              'Create or pick a store for your brand. You can always add more stores later.'}
            {step === 'branding' &&
              'Set a description, colors, logo, and banner so your storefront feels on-brand from day one.'}
            {step === 'product' &&
              'Add at least one product with images so your storefront has something ready to sell.'}
          </p>

            {step === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="firstName">
                      First name
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={profileForm.firstName}
                      onChange={handleProfileChange}
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
                      value={profileForm.lastName}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  This shows up on emails and in your workspace. You can change it anytime.
                </p>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-amber-400 text-slate-950 text-sm font-semibold px-4 py-2.5 hover:bg-amber-300 transition-colors"
                >
                  Save and continue
                </button>
              </form>
            )}

            {step === 'stores' && (loading ? (
            <p className="text-sm text-slate-500">Loading your existing stores…</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : stores.length > 0 ? (
            <div className="space-y-3 mt-4">
              <p className="text-xs font-medium text-slate-600">Choose an existing store</p>
              <div className="space-y-2">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => handleUseExisting(store.id)}
                    className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:border-amber-400/70 hover:shadow-sm transition-all"
                  >
                    <span className="truncate">{store.name ?? 'Unnamed store'}</span>
                    <span className="text-[11px] text-slate-500">Select</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 mt-2">No stores yet. Create your first one on the right.</p>
          ))}
        </div>

        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-amber-200/60 via-sky-200/40 to-fuchsia-200/60 blur-2xl" />
          <div className="relative rounded-3xl border border-slate-200 bg-white/95 backdrop-blur-xl p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            {step === 'stores' && (
              <>
                <h2 className="text-sm font-medium text-slate-900 mb-4">Create a new store</h2>
                <form onSubmit={handleCreate} className="space-y-4">
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
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="description">
                      Description (optional)
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={form.description}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="contactWhatsappLocal">
                        Contact Email
                      </label>
                      <input
                        id="contactEmail"
                        name="contactEmail"
                        type="email"
                        value={form.contactEmail}
                        onChange={handleChange}
                        disabled={useSignupEmailForContact}
                        placeholder="support@yourstore.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                        <input
                          id="useSignupEmailForContact"
                          type="checkbox"
                          checked={useSignupEmailForContact}
                          onChange={toggleUseSignupEmailForContact}
                          className="h-3 w-3 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                        />
                        <label htmlFor="useSignupEmailForContact">
                          Use my account email{signupEmail ? ` (${signupEmail})` : ''}
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="contactWhatsappLocal">
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
                        Buyers will message this WhatsApp number from your storefront.
                      </p>
                    </div>
                  </div>
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
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full inline-flex items-center justify-center rounded-full bg-amber-400 text-slate-950 text-sm font-semibold py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-60"
                  >
                    {creating ? 'Creating…' : 'Create store'}
                  </button>
                </form>
              </>
            )}

            {step === 'branding' && activeStore && (
              <>
                <h2 className="text-sm font-medium text-slate-900 mb-4">Brand your store</h2>
                <form onSubmit={handleSaveBranding} className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Store</p>
                    <p className="text-sm font-medium text-slate-900">{activeStore.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="brand-description">
                      Description
                    </label>
                    <textarea
                      id="brand-description"
                      name="description"
                      rows={3}
                      value={brandForm.description}
                      onChange={handleBrandChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="brandColor">
                        Brand color
                      </label>
                      <div className="relative inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowBrandColorPicker((prev) => !prev)}
                          className="h-9 w-9 rounded-lg border border-slate-200 shadow-sm overflow-hidden"
                          aria-label="Choose brand color"
                        >
                          <span
                            className="block h-full w-full"
                            style={{ backgroundColor: brandForm.brandColor || '#111827' }}
                          />
                        </button>
                        <span className="text-[11px] text-slate-500">Click to fine-tune color</span>

                        {showBrandColorPicker && (
                          <div className="absolute z-30 mt-40 left-0 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl p-3 space-y-2">
                            <label className="block text-[11px] font-medium text-slate-600">Brand color</label>
                            <div
                              className="relative h-32 w-full rounded-xl border border-slate-200 overflow-hidden cursor-crosshair"
                              style={{
                                backgroundImage:
                                  `linear-gradient(to top, black, transparent), linear-gradient(to right, white, ${hexFromHsl(brandColorHsl.h, 100, 100)})`,
                              }}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = (e.clientX - rect.left) / rect.width;
                                const y = 1 - (e.clientY - rect.top) / rect.height;
                                const s = Math.min(100, Math.max(0, x * 100));
                                const l = Math.min(100, Math.max(0, y * 100));
                                const next = { h: brandColorHsl.h, s, l };
                                setBrandColorHsl(next);
                                const hex = hexFromHsl(next.h, next.s, next.l);
                                setBrandForm((prev) => ({ ...prev, brandColor: hex }));
                                setShowBrandColorPicker(false);
                              }}
                            >
                              <div
                                className="pointer-events-none absolute h-3 w-3 rounded-full border border-white shadow-[0_0_0_1px_rgba(15,23,42,0.45)]"
                                style={{
                                  left: `${brandColorHsl.s}%`,
                                  top: `${100 - brandColorHsl.l}%`,
                                  transform: 'translate(-50%, -50%)',
                                }}
                              />
                            </div>
                            <div
                              className="relative h-5 w-full rounded-full border border-slate-200 overflow-hidden cursor-pointer mt-1"
                              style={{
                                background:
                                  'linear-gradient(to right, red, #ff0, #0f0, #0ff, #00f, #f0f, red)',
                              }}
                              onMouseDown={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                                const h = Math.round(x * 360);
                                const next = { ...brandColorHsl, h };
                                setBrandColorHsl(next);
                                const hex = hexFromHsl(next.h, next.s, next.l);
                                setBrandForm((prev) => ({ ...prev, brandColor: hex }));
                                setDraggingBrandHue(true);
                              }}
                              onMouseMove={(e) => {
                                if (!draggingBrandHue) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                                const h = Math.round(x * 360);
                                const next = { ...brandColorHsl, h };
                                setBrandColorHsl(next);
                                const hex = hexFromHsl(next.h, next.s, next.l);
                                setBrandForm((prev) => ({ ...prev, brandColor: hex }));
                              }}
                              onMouseUp={() => setDraggingBrandHue(false)}
                              onMouseLeave={() => setDraggingBrandHue(false)}
                            >
                              <div
                                className="pointer-events-none absolute top-1/2 h-4 w-4 -mt-[2px] rounded-full border border-slate-900/20 bg-white shadow"
                                style={{
                                  left: `${(brandColorHsl.h / 360) * 100}%`,
                                  transform: 'translate(-50%, -50%)',
                                }}
                              />
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
                              <span>Hex</span>
                              <input
                                id="brandColor"
                                name="brandColor"
                                type="text"
                                value={brandForm.brandColor}
                                onChange={(e) => {
                                  handleBrandChange(e);
                                  const next = hslFromHex(e.target.value);
                                  setBrandColorHsl(next);
                                }}
                                className="ml-2 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="brandAccentColor">
                        Accent color
                      </label>
                      <div className="relative inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAccentColorPicker((prev) => !prev)}
                          className="h-9 w-9 rounded-lg border border-slate-200 shadow-sm overflow-hidden"
                          aria-label="Choose accent color"
                        >
                          <span
                            className="block h-full w-full"
                            style={{ backgroundColor: brandForm.brandAccentColor || '#F97316' }}
                          />
                        </button>
                        <span className="text-[11px] text-slate-500">Click to fine-tune color</span>

                        {showAccentColorPicker && (
                          <div className="absolute z-30 mt-40 left-0 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl p-3 space-y-2">
                            <label className="block text-[11px] font-medium text-slate-600">Accent color</label>
                            <div
                              className="relative h-32 w-full rounded-xl border border-slate-200 overflow-hidden cursor-crosshair"
                              style={{
                                backgroundImage:
                                  `linear-gradient(to top, black, transparent), linear-gradient(to right, white, ${hexFromHsl(accentColorHsl.h, 100, 100)})`,
                              }}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = (e.clientX - rect.left) / rect.width;
                                const y = 1 - (e.clientY - rect.top) / rect.height;
                                const s = Math.min(100, Math.max(0, x * 100));
                                const l = Math.min(100, Math.max(0, y * 100));
                                const next = { h: accentColorHsl.h, s, l };
                                setAccentColorHsl(next);
                                const hex = hexFromHsl(next.h, next.s, next.l);
                                setBrandForm((prev) => ({ ...prev, brandAccentColor: hex }));
                                setShowAccentColorPicker(false);
                              }}
                            >
                              <div
                                className="pointer-events-none absolute h-3 w-3 rounded-full border border-white shadow-[0_0_0_1px_rgba(15,23,42,0.45)]"
                                style={{
                                  left: `${accentColorHsl.s}%`,
                                  top: `${100 - accentColorHsl.l}%`,
                                  transform: 'translate(-50%, -50%)',
                                }}
                              />
                            </div>
                            <div
                              className="relative h-5 w-full rounded-full border border-slate-200 overflow-hidden cursor-pointer mt-1"
                              style={{
                                background:
                                  'linear-gradient(to right, red, #ff0, #0f0, #0ff, #00f, #f0f, red)',
                              }}
                              onMouseDown={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                                const h = Math.round(x * 360);
                                const next = { ...accentColorHsl, h };
                                setAccentColorHsl(next);
                                const hex = hexFromHsl(next.h, next.s, next.l);
                                setBrandForm((prev) => ({ ...prev, brandAccentColor: hex }));
                                setDraggingAccentHue(true);
                              }}
                              onMouseMove={(e) => {
                                if (!draggingAccentHue) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                                const h = Math.round(x * 360);
                                const next = { ...accentColorHsl, h };
                                setAccentColorHsl(next);
                                const hex = hexFromHsl(next.h, next.s, next.l);
                                setBrandForm((prev) => ({ ...prev, brandAccentColor: hex }));
                              }}
                              onMouseUp={() => setDraggingAccentHue(false)}
                              onMouseLeave={() => setDraggingAccentHue(false)}
                            >
                              <div
                                className="pointer-events-none absolute top-1/2 h-4 w-4 -mt-[2px] rounded-full border border-slate-900/20 bg-white shadow"
                                style={{
                                  left: `${(accentColorHsl.h / 360) * 100}%`,
                                  transform: 'translate(-50%, -50%)',
                                }}
                              />
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
                              <span>Hex</span>
                              <input
                                id="brandAccentColor"
                                name="brandAccentColor"
                                type="text"
                                value={brandForm.brandAccentColor}
                                onChange={(e) => {
                                  handleBrandChange(e);
                                  const next = hslFromHex(e.target.value);
                                  setAccentColorHsl(next);
                                }}
                                className="ml-2 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="brand-contactEmail">
                        Contact email
                      </label>
                      <input
                        id="brand-contactEmail"
                        name="contactEmail"
                        type="email"
                        value={brandForm.contactEmail}
                        onChange={handleBrandChange}
                        placeholder="support@yourstore.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="brand-contactWhatsapp">
                        WhatsApp number
                      </label>
                      <input
                        id="brand-contactWhatsapp"
                        name="contactWhatsapp"
                        type="text"
                        value={brandForm.contactWhatsapp}
                        onChange={handleBrandChange}
                        placeholder="2348012345678"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="brand-contactLocation">
                        Location
                      </label>
                      <input
                        id="brand-contactLocation"
                        name="contactLocation"
                        type="text"
                        value={brandForm.contactLocation}
                        onChange={handleBrandChange}
                        placeholder="Lagos, Nigeria"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="brand-contactAddress">
                        Address
                      </label>
                      <textarea
                        id="brand-contactAddress"
                        name="contactAddress"
                        rows={2}
                        value={brandForm.contactAddress}
                        onChange={handleBrandChange}
                        placeholder="Street, area, city"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="logo">
                        Logo
                      </label>
                      {!brandForm.logo ? (
                        <div
                          className={`mt-1 rounded-xl border-2 border-dashed px-3 py-3 text-[11px] text-slate-500 cursor-pointer transition-colors ${
                            logoDragOver ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200 bg-slate-50'
                          }`}
                          onClick={() => {
                            if (logoInputRef.current) logoInputRef.current.click();
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setLogoDragOver(true);
                          }}
                          onDragLeave={() => setLogoDragOver(false)}
                          onDrop={async (e) => {
                            e.preventDefault();
                            setLogoDragOver(false);
                            const file = e.dataTransfer.files && e.dataTransfer.files[0];
                            if (file) {
                              await processLogoFile(file);
                            }
                          }}
                        >
                          <p className="mb-1">Drop a logo here, or click to browse.</p>
                          <input
                            id="logo"
                            name="logoFile"
                            type="file"
                            accept="image/*"
                            ref={logoInputRef}
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          {uploadingLogo && <span className="text-[11px] text-slate-500">Uploading…</span>}
                        </div>
                      ) : (
                        <div className="mt-1 relative rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                            <img
                              src={brandForm.logo}
                              alt="Logo preview"
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-500 truncate">{brandForm.logo}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBrandForm((prev) => ({ ...prev, logo: '' }))}
                            className="ml-2 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="banner">
                        Banner image
                      </label>
                      {!brandForm.bannerImage ? (
                        <div
                          className={`mt-1 rounded-xl border-2 border-dashed px-3 py-3 text-[11px] text-slate-500 cursor-pointer transition-colors ${
                            bannerDragOver ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200 bg-slate-50'
                          }`}
                          onClick={() => {
                            if (bannerInputRef.current) bannerInputRef.current.click();
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setBannerDragOver(true);
                          }}
                          onDragLeave={() => setBannerDragOver(false)}
                          onDrop={async (e) => {
                            e.preventDefault();
                            setBannerDragOver(false);
                            const file = e.dataTransfer.files && e.dataTransfer.files[0];
                            if (file) {
                              await processBannerFile(file);
                            }
                          }}
                        >
                          <p className="mb-1">Drop a banner here, or click to browse.</p>
                          <input
                            id="banner"
                            name="bannerFile"
                            type="file"
                            accept="image/*"
                            ref={bannerInputRef}
                            onChange={handleBannerUpload}
                            className="hidden"
                          />
                          {uploadingBanner && <span className="text-[11px] text-slate-500">Uploading…</span>}
                        </div>
                      ) : (
                        <div className="mt-1 relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                          <img
                            src={brandForm.bannerImage}
                            alt="Banner preview"
                            className="h-20 w-full object-cover"
                          />
                          <div className="flex items-center justify-between px-3 pb-2 pt-1">
                            <p className="text-[11px] text-slate-500 truncate mr-2">{brandForm.bannerImage}</p>
                            <button
                              type="button"
                              onClick={() => setBrandForm((prev) => ({ ...prev, bannerImage: '' }))}
                              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingBrand}
                    className="w-full inline-flex items-center justify-center rounded-full bg-amber-400 text-slate-950 text-sm font-semibold py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-60"
                  >
                    {savingBrand ? 'Saving…' : 'Save branding and continue'}
                  </button>
                </form>
              </>
            )}

            {step === 'product' && activeStore && (
              <>
                <h2 className="text-sm font-medium text-slate-900 mb-4">Add a product</h2>
                <form onSubmit={handleCreateProduct} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="product-name">
                      Product name
                    </label>
                    <input
                      id="product-name"
                      name="name"
                      type="text"
                      value={productForm.name}
                      onChange={handleProductChange}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="product-description">
                      Description
                    </label>
                    <textarea
                      id="product-description"
                      name="description"
                      rows={3}
                      value={productForm.description}
                      onChange={handleProductChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="price">
                        Price
                      </label>
                      <input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={productForm.price}
                        onChange={handleProductChange}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="stock">
                        Stock
                      </label>
                      <input
                        id="stock"
                        name="stock"
                        type="number"
                        min="0"
                        step="1"
                        value={productForm.stock}
                        onChange={handleProductChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="product-image">
                      Main image
                    </label>
                    <div
                      className={`mt-1 rounded-xl border-2 border-dashed px-3 py-3 text-[11px] text-slate-500 cursor-pointer transition-colors ${
                        productImageDragOver ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200 bg-slate-50'
                      }`}
                      onClick={() => {
                        if (productImageInputRef.current) productImageInputRef.current.click();
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setProductImageDragOver(true);
                      }}
                      onDragLeave={() => setProductImageDragOver(false)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setProductImageDragOver(false);
                        const file = e.dataTransfer.files && e.dataTransfer.files[0];
                        if (file) {
                          await processProductMainImageFile(file);
                        }
                      }}
                    >
                      <p className="mb-1">Drop a main image here, or click to browse.</p>
                      <input
                        id="product-image"
                        name="productImage"
                        type="file"
                        accept="image/*"
                        ref={productImageInputRef}
                        onChange={handleProductMainImageUpload}
                        className="hidden"
                      />
                      {uploadingProductImage && (
                        <p className="mt-1 text-[11px] text-slate-500 animate-pulse">Uploading image…</p>
                      )}
                    </div>
                    {productForm.image && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden inline-block">
                        <img
                          src={productForm.image}
                          alt="Product image preview"
                          className="h-20 w-32 object-cover"
                        />
                        <p className="px-2 pb-2 pt-1 text-[11px] text-slate-500 truncate max-w-[8rem]">
                          {productForm.image}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="product-gallery">
                      Gallery images
                    </label>
                    <div
                      className={`mt-1 rounded-xl border-2 border-dashed px-3 py-3 text-[11px] text-slate-500 cursor-pointer transition-colors ${
                        productGalleryDragOver ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200 bg-slate-50'
                      }`}
                      onClick={() => {
                        if (productGalleryInputRef.current) productGalleryInputRef.current.click();
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setProductGalleryDragOver(true);
                      }}
                      onDragLeave={() => setProductGalleryDragOver(false)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setProductGalleryDragOver(false);
                        const file = e.dataTransfer.files && e.dataTransfer.files[0];
                        if (file) {
                          await processProductGalleryFile(file);
                        }
                      }}
                    >
                      <p className="mb-1">Drop gallery images here, or click to browse.</p>
                      <input
                        id="product-gallery"
                        name="productGallery"
                        type="file"
                        accept="image/*"
                        ref={productGalleryInputRef}
                        onChange={handleProductGalleryUpload}
                        className="hidden"
                      />
                      {uploadingProductGallery && (
                        <p className="mt-1 text-[11px] text-slate-500 animate-pulse">Uploading images…</p>
                      )}
                    </div>
                    {productForm.gallery && productForm.gallery.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {productForm.gallery.map((url) => (
                          <div
                            key={url}
                            className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden h-16 w-16 flex items-center justify-center"
                          >
                            <img src={url} alt="Gallery preview" className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="w-full inline-flex items-center justify-center rounded-full bg-amber-400 text-slate-950 text-sm font-semibold py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-60"
                  >
                    {savingProduct ? 'Creating…' : 'Create product and finish'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
