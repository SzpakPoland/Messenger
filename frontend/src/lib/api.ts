import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gk_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authAPI = {
  register: (data: FormData) =>
    api.post('/auth/register', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  login: (data: { username: string; password: string }) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
};

export const usersAPI = {
  search: (q: string) => api.get(`/users/search?q=${encodeURIComponent(q)}`),
  getUser: (id: string) => api.get(`/users/${id}`),
  updateProfile: (data: FormData) =>
    api.put('/users/profile', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const conversationsAPI = {
  getAll: () => api.get('/conversations'),
  getOne: (id: string) => api.get(`/conversations/${id}`),
  createPrivate: (recipientId: string) => api.post('/conversations', { recipientId }),
  createGroup: (data: FormData) =>
    api.post('/conversations/group', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateGroup: (id: string, data: FormData) =>
    api.put(`/conversations/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  addMember: (id: string, userId: string) =>
    api.post(`/conversations/${id}/members`, { userId }),
  removeMember: (id: string, userId: string) =>
    api.delete(`/conversations/${id}/members/${userId}`),
};

export const messagesAPI = {
  getMessages: (conversationId: string, page = 1) =>
    api.get(`/conversations/${conversationId}/messages?page=${page}`),
  sendMessage: (conversationId: string, data: { content: string } | FormData) => {
    if (data instanceof FormData) {
      return api.post(`/conversations/${conversationId}/messages`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post(`/conversations/${conversationId}/messages`, data);
  },
  markRead: (conversationId: string, messageId: string) =>
    api.put(`/conversations/${conversationId}/messages/${messageId}/read`),
};

export default api;
