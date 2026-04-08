import api from '../lib/api.js';

const STORES_BASE = '/api/stores';

export async function fetchStoreCustomers(storeId, page = 1, pageSize = 20) {
  if (!storeId) {
    throw new Error('storeId is required to fetch customers');
  }

  const { data } = await api.get(`${STORES_BASE}/${storeId}/customers`, {
    params: { page, pageSize },
  });

  return data;
}

export async function fetchStoreCustomer(storeId, customerId) {
  if (!storeId || !customerId) {
    throw new Error('storeId and customerId are required to fetch a customer');
  }

  const { data } = await api.get(`${STORES_BASE}/${storeId}/customers/${customerId}`);
  return data;
}
