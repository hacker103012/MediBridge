import axios from 'axios';

const api = axios.create({
  baseURL: 'https://medibridge-2-4aze.onrender.com',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('mb_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → try refresh token
let refreshing = false;
let failQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null) {
  failQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
  failQueue = [];
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          failQueue.push({
            resolve: (token) => { original.headers.Authorization = `Bearer ${token}`; resolve(api(original)); },
            reject
          });
        });
      }
      original._retry = true;
      refreshing = true;
      const refreshToken = localStorage.getItem('mb_refresh_token');
      if (!refreshToken) { processQueue(err, null); refreshing = false; return Promise.reject(err); }
      try {
        const res = await axios.post('/api/auth/refresh', { refreshToken });
        const newToken = res.data.accessToken;
        localStorage.setItem('mb_access_token', newToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('mb_access_token');
        localStorage.removeItem('mb_refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
