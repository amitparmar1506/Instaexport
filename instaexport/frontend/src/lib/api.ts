import axios from 'axios';

// Always use direct backend URL — strip trailing slash
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: false,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ie_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — only clear token on explicit auth failure
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ie_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────
export const authApi = {
  getMe: () => api.get('/api/auth/me').then(r => r.data),
  logout: () => api.post('/api/auth/logout'),
  loginUrl: () => `${BASE_URL}/api/auth/instagram`,
};

// ── Posts ─────────────────────────────────────
export const postsApi = {
  list: (refresh = false) => api.get(`/api/posts${refresh ? '?refresh=true' : ''}`).then(r => r.data),
  get: (id: string) => api.get(`/api/posts/${id}`).then(r => r.data),
};

// ── Comments ──────────────────────────────────
export const commentsApi = {
  ingest: (postId: string) => api.post('/api/comments/ingest', { postId }).then(r => r.data),
  list: (postId: string, params?: Record<string, any>) =>
    api.get(`/api/comments/${postId}`, { params }).then(r => r.data),
  replies: (postId: string, parentId: string) =>
    api.get(`/api/comments/${postId}`, { params: { parentId } }).then(r => r.data),
  analytics: (postId: string) => api.get(`/api/comments/${postId}/analytics`).then(r => r.data),
};

// ── Jobs ──────────────────────────────────────
export const jobsApi = {
  get: (jobId: string) => api.get(`/api/jobs/${jobId}`).then(r => r.data),
  list: (postId?: string) => api.get('/api/jobs', { params: postId ? { postId } : {} }).then(r => r.data),
  resume: (jobId: string) => api.post(`/api/jobs/${jobId}/resume`).then(r => r.data),
};

// ── Razorpay Payments ─────────────────────────
export const razorpayApi = {
  createOrder: (type: 'pro_monthly' | 'single_post', postId?: string) =>
    api.post('/api/razorpay/create-order', { type, postId }).then(r => r.data),
  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    type: string;
    postId?: string;
  }) => api.post('/api/razorpay/verify', data).then(r => r.data),
  subscriptionStatus: () => api.get('/api/razorpay/subscription-status').then(r => r.data),
};

// ── Export ────────────────────────────────────
export const exportApi = {
  downloadCsv: async (postId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ie_token') : '';
    const res = await fetch(`${BASE_URL}/api/export/csv/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comments_${postId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  downloadPdf: async (postId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ie_token') : '';
    const res = await fetch(`${BASE_URL}/api/export/pdf/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'PDF export failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comments_${postId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export default api;
