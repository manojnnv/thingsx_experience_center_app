/**
 * Device Service
 * Handles device management API calls
 */

import { get, post, put, del } from '../../utils/api';

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
    return get<Device[]>('/api/devices');
  },

  /**
   * Get device by ID
   */
  getById: async (id: string): Promise<Device> => {
    return get<Device>(`/api/devices/${id}`);
  },

  /**
   * Create new device
   */
  create: async (data: CreateDeviceData): Promise<Device> => {
    return post<Device>('/api/devices', data);
  },

  /**
   * Update device
   */
  update: async (id: string, data: Partial<CreateDeviceData>): Promise<Device> => {
    return put<Device>(`/api/devices/${id}`, data);
  },

  /**
   * Delete device
   */
  delete: async (id: string): Promise<void> => {
    return del(`/api/devices/${id}`);
  },

  /**
   * Get device status
   */
  getStatus: async (id: string): Promise<{ status: Device['status'] }> => {
    return get(`/api/devices/${id}/status`);
  },
};
