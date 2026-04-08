import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useStoreStore } from '../store/store.store.js';
import { fetchProduct, updateProduct } from '../services/product.service.js';
import { uploadFile } from '../services/files.service.js';
import Notify from '../components/Notify.js';

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
        // Wait for a store to be selected or loaded; just stop loading state
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
      } catch (e) {
        if (!cancelled) {
          setError('Failed to load product.');
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

      if (image.trim() !== '') {
        payload.image = image.trim();
      }

      if (gallery.length > 0) {
        payload.gallery = gallery;
      }

      await updateProduct(currentStoreId, productId, payload);
      navigate('/products');
    } catch (e) {
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
      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            ← Back to products
          </button>
          <p className="text-[11px] text-slate-500">Edit the details and media for this product.</p>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Edit product</h1>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading product…</p>
        ) : (
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
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Main image</label>
                <div
                  className={`mt-1 rounded-xl border-2 border-dashed px-3 py-3 text-[11px] text-slate-500 cursor-pointer transition-colors ${
                    mainDragOver ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200 bg-slate-50'
                  }`}
                  onClick={() => {
                    if (mainInputRef.current) mainInputRef.current.click();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setMainDragOver(true);
                  }}
                  onDragLeave={() => setMainDragOver(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setMainDragOver(false);
                    const file = e.dataTransfer.files && e.dataTransfer.files[0];
                    if (file) {
                      await processMainImageFile(file);
                    }
                  }}
                >
                  <p className="mb-1">Drop a main image here, or click to browse.</p>
                  {uploadingMain && <p className="text-[11px] text-slate-500">Uploading…</p>}
                  <input
                    ref={mainInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMainImageUpload}
                  />
                </div>
                {image && (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden inline-block">
                    <img src={image} alt="Product image preview" className="h-20 w-32 object-cover" />
                    <p className="px-2 pb-2 pt-1 text-[11px] text-slate-500 truncate max-w-[10rem]">{image}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Gallery images</label>
                <div
                  className={`mt-1 rounded-xl border-2 border-dashed px-3 py-3 text-[11px] text-slate-500 cursor-pointer transition-colors ${
                    galleryDragOver ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200 bg-slate-50'
                  }`}
                  onClick={() => {
                    if (galleryInputRef.current) galleryInputRef.current.click();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setGalleryDragOver(true);
                  }}
                  onDragLeave={() => setGalleryDragOver(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setGalleryDragOver(false);
                    const file = e.dataTransfer.files && e.dataTransfer.files[0];
                    if (file) {
                      await processGalleryFile(file);
                    }
                  }}
                >
                  <p className="mb-1">Drop gallery images here, or click to browse.</p>
                  {uploadingGallery && <p className="text-[11px] text-slate-500">Uploading…</p>}
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGalleryUpload}
                  />
                </div>
                {gallery && gallery.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {gallery.map((url) => (
                      <div
                        key={url}
                        className="relative rounded-lg border border-slate-200 bg-slate-50 overflow-hidden h-16 w-16 flex items-center justify-center"
                      >
                        <img src={url} alt="Gallery preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(url)}
                          className="absolute top-0 right-0 m-0.5 h-4 w-4 rounded-full bg-slate-900/80 text-[10px] text-white flex items-center justify-center"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
