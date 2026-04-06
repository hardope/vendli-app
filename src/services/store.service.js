import api from '../lib/api.js';

const STORES_BASE = '/api/stores';

export async function fetchMyStores() {
  const { data } = await api.get(`${STORES_BASE}/my`);
  return data;
}

export async function createStore(payload) {
  const { data } = await api.post(STORES_BASE, payload);
  return data;
}

export async function updateStore(id, payload) {
  const { data } = await api.patch(`${STORES_BASE}/${id}`, payload);
  return data;
}
