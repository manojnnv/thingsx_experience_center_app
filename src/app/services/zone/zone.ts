/**
 * Zone Service
 * Handles zone management API calls
 */

import { api } from '@/app/utils/api';

export interface Zone {
  id: string;
  name: string;
  description?: string;
  devices: string[];
  boundaries?: {
    type: 'polygon' | 'rectangle' | 'circle';
    coordinates: number[][];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateZoneData {
  name: string;
  description?: string;
  devices?: string[];
  boundaries?: Zone['boundaries'];
}

export const zoneService = {
  /**
   * Get all zones
   */
  getAll: async (): Promise<Zone[]> => {
    const { data } = await api.get<Zone[]>('/api/zones');
    return data;
  },

  /**
   * Get zone by ID
   */
  getById: async (id: string): Promise<Zone> => {
    const { data } = await api.get<Zone>(`/api/zones/${id}`);
    return data;
  },

  /**
   * Create new zone
   */
  create: async (data: CreateZoneData): Promise<Zone> => {
    const { data: res } = await api.post<Zone>('/api/zones', data);
    return res;
  },

  /**
   * Update zone
   */
  update: async (id: string, data: Partial<CreateZoneData>): Promise<Zone> => {
    const { data: res } = await api.put<Zone>(`/api/zones/${id}`, data);
    return res;
  },

  /**
   * Delete zone
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/zones/${id}`);
  },

  /**
   * Add device to zone
   */
  addDevice: async (zoneId: string, deviceId: string): Promise<Zone> => {
    const { data } = await api.post<Zone>(`/api/zones/${zoneId}/devices`, { deviceId });
    return data;
  },

  /**
   * Remove device from zone
   */
  removeDevice: async (zoneId: string, deviceId: string): Promise<Zone> => {
    const { data } = await api.delete<Zone>(`/api/zones/${zoneId}/devices/${deviceId}`);
    return data;
  },
};
