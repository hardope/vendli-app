import axios from 'axios';
import { useAuthStore } from '../store/auth.store.js';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export const SELLER_APP_URL = import.meta.env.VITE_SELLER_APP_URL ?? 'http://localhost:5174';
export const STOREFRONT_APP_URL = import.meta.env.VITE_STOREFRONT_APP_URL ?? 'http://localhost:5175';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  try {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      // eslint-disable-next-line no-param-reassign
      config.headers = config.headers ?? {};
      // eslint-disable-next-line no-param-reassign
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore store access errors
  }
  return config;
});

export const apiConfig = {
  apiBaseUrl: API_BASE_URL,
  sellerAppUrl: SELLER_APP_URL,
  storefrontAppUrl: STOREFRONT_APP_URL,
};

export default api;
