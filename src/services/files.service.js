import api from '../lib/api.js';

const FILES_BASE = '/api/files';

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post(`${FILES_BASE}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
}
