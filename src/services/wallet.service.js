import api from '../lib/api.js';

const WALLET_BASE = '/api/wallet';

export async function fetchWallet(page = 1, pageSize = 10, storeId) {
  const { data } = await api.get(`${WALLET_BASE}/transactions`, {
    params: { page, pageSize, storeId },
  });

  return data;
}

export async function fetchWalletSummary() {
  const { data } = await api.get(`${WALLET_BASE}/summary`);
  return data;
}
