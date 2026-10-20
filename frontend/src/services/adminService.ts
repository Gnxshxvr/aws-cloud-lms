import { api } from './api';
import { PlatformStats, User, Submission } from '../types';

export const adminService = {
  async getStats(): Promise<{ success: boolean; stats: PlatformStats }> {
    const res = await api.get('/admin/stats');
    return res.data;
  },

  async listUsers(params?: { role?: string; status?: string; search?: string }): Promise<{
    success: boolean;
    count: number;
    users: User[];
  }> {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },

  async createUser(data: {
    email: string;
    password: string;
    full_name: string;
    role: 'student' | 'faculty' | 'admin';
    department?: string;
    student_id_number?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/admin/users', data);
    return res.data;
  },

  async toggleUserStatus(id: number | string, is_active: boolean): Promise<{ success: boolean; message: string }> {
    const res = await api.put(`/admin/users/${id}/status`, { is_active });
    return res.data;
  },

  async listAllSubmissions(): Promise<{ success: boolean; count: number; submissions: Submission[] }> {
    const res = await api.get('/admin/submissions');
    return res.data;
  },
};
