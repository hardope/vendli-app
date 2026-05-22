import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchProduct, updateProduct } from '../services/product.service.js';
import { uploadFile } from '../services/files.service.js';
import Notify from '../components/Notify.js';
import { invalidatePrefix } from '../lib/queryCache.js';

function SectionCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-slate-100">
      {children}
    </div>
  );
}

const INPUT_CLS =
  'mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400';
const LABEL_CLS = 'block text-xs font-medium text-slate-500';

const MAX_GALLERY_IMAGES = 5;

export default function EditProductPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const currentStoreId = useStoreStore((s) => s.currentStoreId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState('');
  const [gallery, setGallery] = useState([]);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [mainDragOver, setMainDragOver] = useState(false);
  const [galleryDragOver, setGalleryDragOver] = useState(false);

  const mainInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!productId) {
        navigate('/products', { replace: true });
        return;
      }

      if (!currentStoreId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const product = await fetchProduct(currentStoreId, productId);
        if (cancelled) return;

        setName(product.name || '');
        setDescription(product.description || '');
        setPrice(product.price != null ? String(product.price) : '');
        setStock(product.stock != null ? String(product.stock) : '');
        setImage(product.image || '');
        setGallery(Array.isArray(product.gallery) ? product.gallery : []);
      } catch {
        if (!cancelled) setError('Failed to load product.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentStoreId, productId, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!currentStoreId || !productId) return;

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
      };

      if (price !== '') {
        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
          setError('Please enter a valid price.');
          setSaving(false);
          return;
        }
        payload.price = numericPrice;
      }

      if (stock !== '') {
        const numericStock = Number(stock);
        if (!Number.isFinite(numericStock) || numericStock < 0) {
          setError('Please enter a valid stock value.');
          setSaving(false);
          return;
        }
        payload.stock = numericStock;
      }

      if (image.trim() !== '') payload.image = image.trim();
      if (gallery.length > 0) payload.gallery = gallery;

      await updateProduct(currentStoreId, productId, payload);
      invalidatePrefix(`products:${currentStoreId}`);
      navigate('/products');
    } catch {
      setError('Failed to save product.');
    } finally {
      setSaving(false);
    }
  }

  const processMainImageFile = async (file) => {
    if (!file) return;
    try {
      setUploadingMain(true);
      const uploaded = await uploadFile(file);
      setImage(uploaded.url);
      Notify.success('Product image uploaded.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      Notify.error('We could not upload your product image. Please try again.');
    } finally {
      setUploadingMain(false);
    }
  };

  const handleMainImageUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    await processMainImageFile(file);
  };

  const processGalleryFile = async (file) => {
    if (!file) return;
    try {
      setUploadingGallery(true);
      const uploaded = await uploadFile(file);
      setGallery((prev) => [...prev, uploaded.url]);
      Notify.success('Gallery image added.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      Notify.error('We could not upload that image. Please try again.');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    await processGalleryFile(file);
  };

  const handleRemoveGalleryImage = (url) => {
    setGallery((prev) => prev.filter((item) => item !== url));
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Page header */}
        <div>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors mb-1 flex items-center gap-1"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Products
          </button>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Edit product</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {loading ? <span className="inline-block h-7 w-48 bg-slate-100 rounded-lg animate-pulse" /> : (name || 'Edit product')}
          </h1>
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-3 items-start animate-pulse">
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                <div className="h-4 w-28 bg-slate-100 rounded" />
              </div>
              <div className="px-5 py-5 space-y-5">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <div className="h-3 w-16 bg-slate-100 rounded mb-2" />
                    <div className="h-9 w-full bg-slate-100 rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                <div className="h-4 w-12 bg-slate-100 rounded" />
              </div>
              <div className="px-5 py-5">
                <div className="h-40 w-full bg-slate-100 rounded-xl" />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3 items-start">
            {/* Details card */}
            <SectionCard className="md:col-span-2">
              <SectionHeader>
                <p className="text-sm font-semibold text-slate-900">Product details</p>
              </SectionHeader>
              <form onSubmit={handleSubmit}>
                <div className="px-5 py-5 space-y-5">
                  {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className={LABEL_CLS}>Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={INPUT_CLS}
                      required
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className={INPUT_CLS}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_CLS}>Price (₦)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Stock</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/products')}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </SectionCard>

            {/* Media card */}
            <SectionCard>
              <SectionHeader>
                <p className="text-sm font-semibold text-slate-900">Media</p>
              </SectionHeader>
              <div className="px-5 py-5 space-y-5">
                {/* Main image */}
                <div>
                  <label className={LABEL_CLS + ' mb-2'}>Main image</label>
                  <div
                    className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                      mainDragOver ? 'border-amber-400 bg-amber-50/50' : 'border-slate-200 bg-slate-50'
                    }`}
                    onClick={() => mainInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setMainDragOver(true); }}
                    onDragLeave={() => setMainDragOver(false)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setMainDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) await processMainImageFile(file);
                    }}
                  >
                    {image ? (
                      <div className="group relative overflow-hidden rounded-[10px]">
                        <img src={image} alt="Product" className="w-full h-40 object-cover" />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-white font-medium bg-slate-900/60 px-3 py-1 rounded-full">
                            Replace
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-36 text-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-slate-300 mb-2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <p className="text-xs text-slate-500">Drop image or click to upload</p>
                      </div>
                    )}
                    {uploadingMain && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-white/80 backdrop-blur-sm">
                        <p className="text-xs text-slate-600 animate-pulse">Uploading…</p>
                      </div>
                    )}
                    <input
                      ref={mainInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleMainImageUpload}
                    />
                  </div>
                </div>

                {/* Gallery */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={LABEL_CLS}>Gallery</label>
                    <span className="text-[11px] text-slate-400">{gallery.length}/{MAX_GALLERY_IMAGES}</span>
                  </div>
                  {gallery.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {gallery.map((url) => (
                        <div key={url} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square">
                          <img src={url} alt="Gallery" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(url)}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-slate-900/70 text-white text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {gallery.length < MAX_GALLERY_IMAGES && (
                    <div
                      className={`relative flex flex-col items-center justify-center h-16 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                        galleryDragOver ? 'border-amber-400 bg-amber-50/50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                      onClick={() => galleryInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setGalleryDragOver(true); }}
                      onDragLeave={() => setGalleryDragOver(false)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setGalleryDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) await processGalleryFile(file);
                      }}
                    >
                      <p className="text-xs text-slate-500">Add images</p>
                      {uploadingGallery && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                          <p className="text-xs text-slate-600 animate-pulse">Uploading…</p>
                        </div>
                      )}
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleGalleryUpload}
                      />
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
