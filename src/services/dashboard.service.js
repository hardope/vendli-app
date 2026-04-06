import apiClient from '../lib/api';

export async function fetchStoreDashboardSummary(storeId) {
  if (!storeId) {
    throw new Error('storeId is required to fetch dashboard summary');
  }
  const { data } = await apiClient.get(`/api/stores/${storeId}/dashboard-summary`);
  return data;
}
