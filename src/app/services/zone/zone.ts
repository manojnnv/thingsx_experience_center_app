/**
 * Zone Service
 * Handles zone management API calls
 */

import { get, post, put, del } from '../../utils/api';

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
    return get<Zone[]>('/api/zones');
  },

  /**
   * Get zone by ID
   */
  getById: async (id: string): Promise<Zone> => {
    return get<Zone>(`/api/zones/${id}`);
  },

  /**
   * Create new zone
   */
  create: async (data: CreateZoneData): Promise<Zone> => {
    return post<Zone>('/api/zones', data);
  },

  /**
   * Update zone
   */
  update: async (id: string, data: Partial<CreateZoneData>): Promise<Zone> => {
    return put<Zone>(`/api/zones/${id}`, data);
  },

  /**
   * Delete zone
   */
  delete: async (id: string): Promise<void> => {
    return del(`/api/zones/${id}`);
  },

  /**
   * Add device to zone
   */
  addDevice: async (zoneId: string, deviceId: string): Promise<Zone> => {
    return post<Zone>(`/api/zones/${zoneId}/devices`, { deviceId });
  },

  /**
   * Remove device from zone
   */
  removeDevice: async (zoneId: string, deviceId: string): Promise<Zone> => {
    return del(`/api/zones/${zoneId}/devices/${deviceId}`);
  },
};
