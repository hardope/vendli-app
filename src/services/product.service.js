import api from '../lib/api.js';

const STORES_BASE = '/api/stores';

export async function fetchProducts(storeId, params = {}) {
  const { data } = await api.get(`${STORES_BASE}/${storeId}/products`, { params });
  return data;
}

export async function fetchProduct(storeId, id) {
  const { data } = await api.get(`${STORES_BASE}/${storeId}/products/${id}`);
  return data;
}

export async function fetchProductOverview(storeId, id) {
  const { data } = await api.get(`${STORES_BASE}/${storeId}/products/${id}/overview`);
  return data;
}

export async function createProduct(storeId, payload) {
  const { data } = await api.post(`${STORES_BASE}/${storeId}/products`, payload);
  return data;
}

export async function updateProduct(storeId, id, payload) {
  const { data } = await api.patch(`${STORES_BASE}/${storeId}/products/${id}`, payload);
  return data;
}

export async function updateProductStatus(storeId, id, status) {
  const { data } = await api.patch(`${STORES_BASE}/${storeId}/products/${id}/status`, { status });
  return data;
}

export async function archiveProduct(storeId, id) {
  const { data } = await api.patch(`${STORES_BASE}/${storeId}/products/${id}/archive`);
  return data;
}

export async function deleteProduct(storeId, id) {
  const { data } = await api.delete(`${STORES_BASE}/${storeId}/products/${id}`);
  return data;
}

export async function createProductVariant(storeId, productId, payload) {
  const { data } = await api.post(`${STORES_BASE}/${storeId}/products/${productId}/variants`, payload);
  return data;
}
