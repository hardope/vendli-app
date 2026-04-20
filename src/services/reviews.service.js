import apiClient from '../lib/api';

export async function fetchStoreReviewsForSeller(storeId, options = {}) {
  if (!storeId) {
    throw new Error('storeId is required to fetch store reviews');
  }

  const page = typeof options.page === 'number' ? options.page : 1;
  const pageSize = typeof options.pageSize === 'number' ? options.pageSize : 10;
  const textOnly = !!options.textOnly;

  const { data } = await apiClient.get(`/api/stores/${storeId}/reviews`, {
    params: {
      page,
      pageSize,
      textOnly: textOnly ? 'true' : undefined,
    },
  });

  return data;
}
