import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://instaexport-production.up.railway.app';

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ie_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export const authApi = {
  getMe: () => api.get('/api/auth/me').then(r => r.data),
  logout: () => api.post('/api/auth/logout'),
  loginUrl: () => `${BACKEND_URL}/api/auth/instagram`,
};

export const postsApi = {
  list: (refresh = false) => api.get(`/api/posts${refresh ? '?refresh=true' : ''}`).then(r => r.data),
  get: (id: string) => api.get(`/api/posts/${id}`).then(r => r.data),
};

export const commentsApi = {
  ingest: (postId: string, deltaSync?: boolean) =>
    api.post('/api/comments/ingest', { postId, deltaSync: !!deltaSync }).then(r => r.data),
  list: (postId: string, params?: Record<string, any>) =>
    api.get(`/api/comments/${postId}`, { params }).then(r => r.data),
  replies: (postId: string, parentId: string) =>
    api.get(`/api/comments/${postId}`, { params: { parentId } }).then(r => r.data),
  analytics: (postId: string) => api.get(`/api/comments/${postId}/analytics`).then(r => r.data),
};

export const jobsApi = {
  get: (jobId: string) => api.get(`/api/jobs/${jobId}`).then(r => r.data),
  list: (postId?: string) => api.get('/api/jobs', { params: postId ? { postId } : {} }).then(r => r.data),
  resume: (jobId: string) => api.post(`/api/jobs/${jobId}/resume`).then(r => r.data),
};

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

export const exportApi = {
  downloadCsv: async (postId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ie_token') : '';
    const res = await fetch(`${BACKEND_URL}/api/export/csv/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comments_${postId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  downloadPdf: async (postId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ie_token') : '';
    const res = await fetch(`${BACKEND_URL}/api/export/pdf/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `PDF export failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comments_${postId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  downloadUcp: async (postId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ie_token') : '';
    const res = await fetch(`${BACKEND_URL}/api/export/ucp/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `UCP export failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comments_${postId}.ucp`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export default api;
