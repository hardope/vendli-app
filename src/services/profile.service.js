import api from '../lib/api.js';

const PROFILE_BASE = '/api/profile';

export async function getProfile() {
  const { data } = await api.get(PROFILE_BASE);
  return data;
}

export async function updateProfile(payload) {
  const { data } = await api.patch(PROFILE_BASE, payload);
  return data;
}
