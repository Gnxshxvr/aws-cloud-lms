import { api } from './api';
import { Assignment } from '../types';

export const assignmentService = {
  async listAssignments(params?: {
    course?: string;
    status?: string;
    search?: string;
  }): Promise<{ success: boolean; count: number; assignments: Assignment[] }> {
    const res = await api.get('/assignments', { params });
    return res.data;
  },

  async getAssignmentById(id: number | string): Promise<{ success: boolean; assignment: Assignment }> {
    const res = await api.get(`/assignments/${id}`);
    return res.data;
  },

  async createAssignment(formData: FormData): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/assignments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async updateAssignment(id: number | string, formData: FormData): Promise<{ success: boolean; message: string }> {
    const res = await api.put(`/assignments/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async deleteAssignment(id: number | string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/assignments/${id}`);
    return res.data;
  },

  async sendDeadlineReminder(id: number | string): Promise<{ success: boolean; message: string; sent_count: number }> {
    const res = await api.post(`/assignments/${id}/send-reminder`);
    return res.data;
  },
};
