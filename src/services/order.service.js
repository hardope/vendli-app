import api from '../lib/api.js';

const STORES_BASE = '/api/stores';

export async function fetchStoreOrders(storeId, page = 1, pageSize = 20) {
  if (!storeId) {
    throw new Error('storeId is required to fetch orders');
  }

  const { data } = await api.get(`${STORES_BASE}/${storeId}/orders`, {
    params: { page, pageSize },
  });

  return data;
}

export async function fetchStoreOrder(storeId, orderId) {
  if (!storeId || !orderId) {
    throw new Error('storeId and orderId are required to fetch an order');
  }

  const { data } = await api.get(`${STORES_BASE}/${storeId}/orders/${orderId}`);
  return data;
}

export async function updateStoreOrderStatus(storeId, orderId, status) {
  if (!storeId || !orderId) {
    throw new Error('storeId and orderId are required to update an order');
  }

  const { data } = await api.patch(`${STORES_BASE}/${storeId}/orders/${orderId}/status`, { status });
  return data;
}
