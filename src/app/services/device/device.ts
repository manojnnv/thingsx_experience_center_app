/**
 * Device Service
 * Handles device management API calls
 */

import { api } from '@/app/utils/api';

export interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'maintenance';
  location: string;
  lastSeen: string;
  metadata?: Record<string, unknown>;
}

export interface CreateDeviceData {
  name: string;
  type: string;
  location: string;
  metadata?: Record<string, unknown>;
}

export const deviceService = {
  /**
   * Get all devices
   */
  getAll: async (): Promise<Device[]> => {
    const { data } = await api.get<Device[]>('/api/devices');
    return data;
  },

  /**
   * Get device by ID
   */
  getById: async (id: string): Promise<Device> => {
    const { data } = await api.get<Device>(`/api/devices/${id}`);
    return data;
  },

  /**
   * Create new device
   */
  create: async (data: CreateDeviceData): Promise<Device> => {
    const { data: res } = await api.post<Device>('/api/devices', data);
    return res;
  },

  /**
   * Update device
   */
  update: async (id: string, data: Partial<CreateDeviceData>): Promise<Device> => {
    const { data: res } = await api.put<Device>(`/api/devices/${id}`, data);
    return res;
  },

  /**
   * Delete device
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/devices/${id}`);
  },

  /**
   * Get device status
   */
  getStatus: async (id: string): Promise<{ status: Device['status'] }> => {
    const { data } = await api.get<{ status: Device['status'] }>(`/api/devices/${id}/status`);
    return data;
  },
};
