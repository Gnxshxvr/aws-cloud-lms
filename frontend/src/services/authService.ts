import { api } from './api';
import { User } from '../types';

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export const authService = {
  async register(data: {
    email: string;
    password: string;
    full_name: string;
    department?: string;
    student_id_number?: string;
  }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  async getProfile(): Promise<{ success: boolean; user: User }> {
    const res = await api.get<{ success: boolean; user: User }>('/auth/profile');
    return res.data;
  },
};
