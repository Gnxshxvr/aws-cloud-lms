import { api } from './api';
import { EmailNotification } from '../types';

export const notificationService = {
  async getMyNotifications(): Promise<{
    success: boolean;
    count: number;
    notifications: EmailNotification[];
  }> {
    const res = await api.get('/notifications/my');
    return res.data;
  },

  async getAllNotifications(): Promise<{
    success: boolean;
    count: number;
    notifications: EmailNotification[];
  }> {
    const res = await api.get('/notifications/all');
    return res.data;
  },

  async trigger24hScan(): Promise<{
    success: boolean;
    message: string;
    sent_count: number;
  }> {
    const res = await api.post('/notifications/trigger-24h');
    return res.data;
  },
};
