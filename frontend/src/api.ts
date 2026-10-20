import axios from 'axios';
import type { User, DocumentItem, DocumentPermission, AuditLog, ChainVerificationResult, AISuggestion } from './types';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('trustvault_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<User> => {
    const res = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('trustvault_token', res.data.token);
    return res.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('trustvault_token');
  },

  // Documents
  getDocuments: async (params?: { title?: string; category?: string; ownerEmail?: string }): Promise<DocumentItem[]> => {
    const res = await apiClient.get('/documents', { params });
    return res.data;
  },

  getDocument: async (id: string): Promise<DocumentItem> => {
    const res = await apiClient.get(`/documents/${id}`);
    return res.data;
  },

  uploadDocument: async (formData: FormData): Promise<DocumentItem> => {
    const res = await apiClient.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  updateDocument: async (id: string, data: { title: string; description: string; category: string }): Promise<DocumentItem> => {
    const res = await apiClient.put(`/documents/${id}`, data);
    return res.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  getCategories: async (): Promise<string[]> => {
    const res = await apiClient.get('/documents/categories');
    return res.data;
  },

  streamDocument: async (id: string, filename: string): Promise<void> => {
    const response = await apiClient.get(`/documents/${id}/stream`, {
      responseType: 'blob',
    });
    
    // Trigger browser download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Permissions
  getPermissions: async (documentId: string): Promise<DocumentPermission[]> => {
    const res = await apiClient.get(`/permissions/documents/${documentId}`);
    return res.data;
  },

  grantPermission: async (documentId: string, userEmail: string, permissionLevel: 'READ' | 'EDIT'): Promise<DocumentPermission> => {
    const res = await apiClient.post(`/permissions/documents/${documentId}`, {
      userEmail,
      permissionLevel,
    });
    return res.data;
  },

  revokePermission: async (documentId: string, userEmail: string): Promise<void> => {
    await apiClient.delete(`/permissions/documents/${documentId}`, {
      params: { userEmail },
    });
  },

  // AI Suggestions
  getAISuggestions: async (documentId: string): Promise<AISuggestion[]> => {
    const res = await apiClient.get(`/ai/documents/${documentId}/suggestions`);
    return res.data;
  },

  confirmAISuggestion: async (documentId: string, userEmail: string, permissionLevel: 'READ' | 'EDIT', confirmed: boolean): Promise<any> => {
    const res = await apiClient.post('/ai/documents/confirm', {
      documentId,
      userEmail,
      permissionLevel,
      confirmed,
    });
    return res.data;
  },

  // Admin Audit
  getAuditLogs: async (status?: string): Promise<AuditLog[]> => {
    const res = await apiClient.get('/audit/logs', { params: status ? { status } : {} });
    return res.data;
  },

  verifyAuditIntegrity: async (): Promise<ChainVerificationResult> => {
    const res = await apiClient.get('/audit/verify');
    return res.data;
  },

  getAuditStats: async (): Promise<{ totalEvents: number; deniedAttempts: number; totalDownloads: number; permissionChanges: number }> => {
    const res = await apiClient.get('/audit/stats');
    return res.data;
  },
};
