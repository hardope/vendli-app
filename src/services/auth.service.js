import api from '../lib/api.js';

const AUTH_BASE = '/api/auth';

export async function register(payload) {
  const { data } = await api.post(`${AUTH_BASE}/register`, payload);
  return data;
}

export async function login(payload) {
  const { data } = await api.post(`${AUTH_BASE}/login`, payload);
  return data;
}

export async function verifyEmailWithToken(token) {
  const { data } = await api.post(`${AUTH_BASE}/verify-email`, { token });
  return data;
}

export async function verifyEmailWithOtp(email, otp) {
  const { data } = await api.post(`${AUTH_BASE}/verify-email`, { email, otp });
  return data;
}

export async function forgotPassword(email) {
  const { data } = await api.post(`${AUTH_BASE}/forgot-password`, { email });
  return data;
}

export async function resetPassword(payload) {
  const body = {
    email: payload.email,
    otp: payload.otp,
    password: payload.password,
  };
  const { data } = await api.post(`${AUTH_BASE}/reset-password`, body);
  return data;
}

export async function refreshToken(refreshTokenValue) {
  const { data } = await api.post(`${AUTH_BASE}/refresh`, { refreshToken: refreshTokenValue });
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get(`${AUTH_BASE}/me`);
  return data;
}
