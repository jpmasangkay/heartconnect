/// <reference types="vite/client" />
import axios from 'axios';
import type {
  User,
  Job,
  Application,
  Conversation,
  Message,
  LoginCredentials,
  RegisterData,
  LoginResponse,
  JobFilters,
  ApplicationStatus,
  Notification,
  Review,
  SavedJob,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect on 401 (but not for /auth/* endpoints which manage their own UX)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = String(error.config?.url || '');
    const isAuthRoute =
      url.includes('/auth/') ||
      url.includes('auth/login') ||
      url.includes('auth/register') ||
      url.includes('auth/me') ||
      url.includes('auth/logout') ||
      url.includes('auth/forgot-password') ||
      url.includes('auth/reset-password') ||
      url.includes('auth/2fa');
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<LoginResponse>('/auth/login', credentials),

  register: (data: RegisterData) =>
    api.post<{ token: string; user: User }>('/auth/register', data),

  getMe: (opts?: { signal?: AbortSignal }) =>
    api.get<User>('/auth/me', { signal: opts?.signal }),

  updateProfile: (data: Partial<User>) =>
    api.put<User>('/auth/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/password', data),

  logout: () => api.post('/auth/logout', {}),

  getUser: (id: string, opts?: { signal?: AbortSignal }) =>
    api.get<User>(`/auth/users/${id}`, { signal: opts?.signal }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  completeOnboarding: () =>
    api.patch<User>('/auth/onboarding-complete'),
};

// ─── 2FA ──────────────────────────────────────────────────────────────────────

export const twoFactorApi = {
  setup: (method: 'totp' | 'email') =>
    api.post<{ secret?: string; qrCodeUrl?: string; method: string; message?: string }>('/auth/2fa/setup', { method }),

  verifySetup: (code: string) =>
    api.post('/auth/2fa/verify-setup', { code }),

  verify: (tempToken: string, code: string) =>
    api.post<{ token: string; user: User }>('/auth/2fa/verify', { tempToken, code }),

  disable: (password: string, code: string) =>
    api.post('/auth/2fa/disable', { password, code }),

  sendEmailCode: (tempToken: string) =>
    api.post('/auth/2fa/send-email-code', { tempToken }),
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const jobsApi = {
  getAll: (filters: JobFilters = {}, opts?: { signal?: AbortSignal }) =>
    api.get<{ data: Job[]; total: number; pages: number }>('/jobs', {
      params: filters,
      signal: opts?.signal,
    }),

  getById: (id: string, opts?: { signal?: AbortSignal }) =>
    api.get<Job>(`/jobs/${id}`, { signal: opts?.signal }),

  create: (data: Partial<Job>) => api.post<Job>('/jobs', data),

  update: (id: string, data: Partial<Job>) => api.put<Job>(`/jobs/${id}`, data),

  delete: (id: string) => api.delete(`/jobs/${id}`),

  close: (id: string) => api.patch<Job>(`/jobs/${id}/close`),

  complete: (id: string) => api.patch<Job>(`/jobs/${id}/complete`),

  getMyJobs: (opts?: { signal?: AbortSignal }) =>
    api.get<Job[]>('/jobs/my', { signal: opts?.signal }),

  getCategories: () => api.get<{ categories: string[] }>('/jobs/categories'),
};

// ─── Applications ─────────────────────────────────────────────────────────────

export const applicationsApi = {
  apply: (jobId: string, data: { coverLetter: string; proposedRate: number }) =>
    api.post<Application>(`/jobs/${jobId}/applications`, data),

  getForJob: (jobId: string, opts?: { signal?: AbortSignal }) =>
    api.get<Application[]>(`/jobs/${jobId}/applications`, { signal: opts?.signal }),

  getMyApplications: (opts?: { signal?: AbortSignal }) =>
    api.get<Application[]>('/applications/my', { signal: opts?.signal }),

  updateStatus: (id: string, status: ApplicationStatus) =>
    api.patch<Application>(`/applications/${id}/status`, { status }),

  withdraw: (id: string) =>
    api.patch<Application>(`/applications/${id}/withdraw`),
};

// ─── Messages / Conversations ────────────────────────────────────────────────

export const messagesApi = {
  getConversations: (opts?: { signal?: AbortSignal }) =>
    api.get<Conversation[]>('/conversations', { signal: opts?.signal }),

  getOrCreate: (jobId: string, participantId: string) =>
    api.post<Conversation>('/conversations', { jobId, participantId }),

  getMessages: (conversationId: string, opts?: { signal?: AbortSignal }) =>
    api.get<Message[]>(`/conversations/${conversationId}/messages`, { signal: opts?.signal }),

  sendMessage: (conversationId: string, content: string) =>
    api.post<Message>(`/conversations/${conversationId}/messages`, { content }),

  sendFileMessage: (conversationId: string, file: File, content?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (content?.trim()) formData.append('content', content);
    return api.post<Message>(`/conversations/${conversationId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  markRead: (conversationId: string) =>
    api.patch(`/conversations/${conversationId}/read`),

  getUnreadCount: () => api.get<{ count: number }>('/conversations/unread'),

  deleteConversation: (conversationId: string) =>
    api.delete(`/conversations/${conversationId}`),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  getAll: (page = 1, opts?: { signal?: AbortSignal }) =>
    api.get<{ data: Notification[]; total: number; pages: number; page: number }>(
      '/notifications', { params: { page, limit: 20 }, signal: opts?.signal }
    ),

  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),

  markRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllRead: () => api.patch('/notifications/read-all'),
};

// ─── Saved Jobs ───────────────────────────────────────────────────────────────

export const savedJobsApi = {
  getAll: (opts?: { signal?: AbortSignal }) =>
    api.get<SavedJob[]>('/saved-jobs', { signal: opts?.signal }),

  check: (jobId: string) =>
    api.get<{ saved: boolean }>(`/saved-jobs/check/${jobId}`),

  save: (jobId: string) =>
    api.post('/saved-jobs', { jobId }),

  unsave: (jobId: string) =>
    api.delete(`/saved-jobs/${jobId}`),
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviewsApi = {
  create: (data: { jobId: string; revieweeId: string; rating: number; comment?: string }) =>
    api.post<Review>('/reviews', data),

  getForUser: (userId: string, opts?: { signal?: AbortSignal; limit?: number; page?: number }) =>
    api.get<{ data: Review[]; avgRating: number; total: number; pages: number; page: number }>(
      `/reviews/user/${userId}`, { params: { limit: opts?.limit, page: opts?.page }, signal: opts?.signal }
    ),

  getForJob: (jobId: string, opts?: { signal?: AbortSignal }) =>
    api.get<Review[]>(`/reviews/job/${jobId}`, { signal: opts?.signal }),

  getPending: (opts?: { signal?: AbortSignal }) =>
    api.get<{ job: Job; reviewee: User }[]>('/reviews/pending', { signal: opts?.signal }),
};

// ─── Verification ─────────────────────────────────────────────────────────────

export const verificationApi = {
  requestSchoolEmail: () =>
    api.post('/verification/request', { method: 'school_email' }),

  requestIdUpload: (file: File) => {
    const formData = new FormData();
    formData.append('idPhoto', file);
    return api.post('/verification/request-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getStatus: () =>
    api.get<{ isVerified: boolean; verificationMethod: string; verificationStatus: string }>('/verification/status'),

  // Admin endpoints
  getPending: () =>
    api.get<User[]>('/verification/pending'),

  approve: (userId: string) =>
    api.patch(`/verification/${userId}/verify`, { action: 'approve' }),

  reject: (userId: string) =>
    api.patch(`/verification/${userId}/verify`, { action: 'reject' }),

  manualVerify: (userId: string) =>
    api.patch(`/verification/${userId}/manual-verify`),
};

// ─── Reports ──────────────────────────────────────────────────────────────────

import type { Report, ReportTargetType, ReportReason } from '../types';

export const reportsApi = {
  create: (data: { targetType: ReportTargetType; targetId: string; reason: ReportReason; description?: string }) =>
    api.post<Report>('/reports', data),

  getAll: (status = 'pending', page = 1, opts?: { signal?: AbortSignal }) =>
    api.get<{ data: Report[]; total: number; pages: number; page: number }>(
      '/reports', { params: { status, page, limit: 20 }, signal: opts?.signal }
    ),

  resolve: (id: string, action: 'reviewed' | 'dismissed') =>
    api.patch<Report>(`/reports/${id}`, { action }),
};

// ─── User Blocks ──────────────────────────────────────────────────────────────

export const blocksApi = {
  block: (userId: string) =>
    api.post(`/blocks/${userId}`),

  unblock: (userId: string) =>
    api.delete(`/blocks/${userId}`),

  getAll: (opts?: { signal?: AbortSignal }) =>
    api.get<User[]>('/blocks', { signal: opts?.signal }),

  check: (userId: string) =>
    api.get<{ blocked: boolean }>(`/blocks/check/${userId}`),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  getUsers: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<{ data: User[]; total: number; pages: number; page: number }>(
      '/admin/users', { params }
    ),

  banUser: (userId: string, reason?: string) =>
    api.post(`/admin/ban/${userId}`, { reason }),

  unbanUser: (userId: string) =>
    api.post(`/admin/unban/${userId}`),
};

export default api;
