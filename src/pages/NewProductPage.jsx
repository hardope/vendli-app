"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { createProduct } from '../services/product.service.js';
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

export default function NewProductPage() {
  const navigate = useNavigate();
  const currentStoreId = useStoreStore((s) => s.currentStoreId);

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

  if (!currentStoreId) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm text-slate-600">
            Pick or create a store from the sidebar first to add products.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentStoreId) return;

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
      };

      if (!payload.name) {
        setError('Please enter a product name.');
        setSaving(false);
        return;
      }

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

      await createProduct(currentStoreId, payload);
      invalidatePrefix(`products:${currentStoreId}`);
      Notify.success('Product created.');
      navigate('/products');
    } catch {
      setError('Failed to create product.');
    } finally {
      setSaving(false);
    }
  };

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
    if (gallery.length >= MAX_GALLERY_IMAGES) {
      Notify.error(`You can only add up to ${MAX_GALLERY_IMAGES} gallery images.`);
      return;
    }
    try {
      setUploadingGallery(true);
      const uploaded = await uploadFile(file);
      setGallery((prev) => {
        if (prev.length >= MAX_GALLERY_IMAGES) return prev;
        return [...prev, uploaded.url];
      });
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = MAX_GALLERY_IMAGES - gallery.length;
    if (availableSlots <= 0) {
      Notify.error(`You can only add up to ${MAX_GALLERY_IMAGES} gallery images.`);
      return;
    }

    const filesArray = Array.from(files).slice(0, availableSlots);
    if (files.length > availableSlots) {
      Notify.error(`You can only add up to ${MAX_GALLERY_IMAGES} gallery images per product.`);
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const file of filesArray) {
      // eslint-disable-next-line no-await-in-loop
      await processGalleryFile(file);
    }
    // eslint-disable-next-line no-param-reassign
    e.target.value = '';
  };

  const handleRemoveGalleryImage = (url) => {
    setGallery((prev) => prev.filter((item) => item !== url));
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Page header */}
        <div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">New product</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Add product</h1>
        </div>

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
                    placeholder="e.g. Handmade leather bag"
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
                    placeholder="Describe your product for customers…"
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
                      placeholder="0.00"
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
                      placeholder="0"
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
                  {saving ? 'Creating…' : 'Create product'}
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
                <div className="relative group">
                  {image ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200">
                      <img src={image} alt="Product" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-white font-medium bg-slate-900/60 px-3 py-1 rounded-full">
                          Replace
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        onChange={handleMainImageUpload}
                      />
                    </div>
                  ) : (
                    <div className="relative flex flex-col items-center justify-center h-36 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center transition-colors hover:border-slate-300">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-slate-300 mb-2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p className="text-xs text-slate-500">Drop image or click to upload</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        onChange={handleMainImageUpload}
                      />
                    </div>
                  )}
                  {uploadingMain && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                      <p className="text-xs text-slate-600 animate-pulse">Uploading…</p>
                    </div>
                  )}
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
                  <div className="relative flex items-center justify-center h-16 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 cursor-pointer">
                    <p className="text-xs text-slate-500">Add images</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={handleGalleryUpload}
                    />
                    {uploadingGallery && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                        <p className="text-xs text-slate-600 animate-pulse">Uploading…</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
