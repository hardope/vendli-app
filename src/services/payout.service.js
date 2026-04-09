import api from '../lib/api.js';

const BASE = '/api';

export async function fetchPayoutMethods() {
  const { data } = await api.get(`${BASE}/payout-methods`);
  return data;
}

export async function startCreatePayoutMethod(payload) {
  const { data } = await api.post(`${BASE}/payout-methods/start`, payload);
  return data;
}

export async function confirmPayoutMethod(payload) {
  const { data } = await api.post(`${BASE}/payout-methods/confirm`, payload);
  return data;
}

export async function fetchPayoutRequests() {
  const { data } = await api.get(`${BASE}/payout-requests`);
  return data;
}

export async function createPayoutRequest(payload) {
  const { data } = await api.post(`${BASE}/payout-requests`, payload);
  return data;
}
