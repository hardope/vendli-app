"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { createProduct } from '../services/product.service.js';
import { uploadFile } from '../services/files.service.js';
import Notify from '../components/Notify.js';

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
        <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
          <p className="text-sm text-slate-600">
            Pick or create a store from the sidebar first to add products.
          </p>
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

      if (image.trim() !== '') {
        payload.image = image.trim();
      }

      if (gallery.length > 0) {
        payload.gallery = gallery;
      }

      await createProduct(currentStoreId, payload);
      Notify.success('Product created.');
      navigate('/products');
    } catch (e) {
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
      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            
            
            
            
            
            
            ← Back to products
          </button>
          <p className="text-[11px] text-slate-500">Create a new product for this store.</p>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Add product</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-3 items-start">
          <form onSubmit={handleSubmit} className="md:col-span-2 space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div>
              <label className="block text-xs font-medium text-slate-600">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600">Price (₦)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Stock</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Create product'}
              </button>
            </div>
          </form>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Main image</label>
              <div
                className="relative flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500"
              >
                {image ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img src={image} alt="Product image" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <span>Drop an image here or click to upload.</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={handleMainImageUpload}
                />
              </div>
              {uploadingMain && (
                <p className="mt-1 text-[11px] text-slate-500">Uploading image…</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Gallery images</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {gallery.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => handleRemoveGalleryImage(url)}
                    className="relative h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                  >
                    {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                    <img src={url} alt="Gallery image" className="h-full w-full object-cover" />
                    <span className="absolute top-0 right-0 m-0.5 rounded-full bg-slate-900/80 px-1 text-[9px] text-white">×</span>
                  </button>
                ))}
              </div>
              <div
                className="relative flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-[11px] text-slate-500"
              >
                <span>Add another image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={handleGalleryUpload}
                />
              </div>
              {uploadingGallery && (
                <p className="mt-1 text-[11px] text-slate-500">Uploading image…</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
