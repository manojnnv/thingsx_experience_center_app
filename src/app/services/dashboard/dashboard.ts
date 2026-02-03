/**
 * Dashboard Service
 * Handles dashboard-related API calls
 */

import { api } from '@/app/utils/api';

export interface DashboardStats {
  totalDevices: number;
  activeDevices: number;
  totalZones: number;
  alerts: number;
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  data: unknown;
}

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>('/api/dashboard/stats');
    return data;
  },

  /**
   * Get dashboard widgets configuration
   */
  getWidgets: async (): Promise<DashboardWidget[]> => {
    const { data } = await api.get<DashboardWidget[]>('/api/dashboard/widgets');
    return data;
  },

  /**
   * Update dashboard widget layout
   */
  updateWidgetLayout: async (widgets: DashboardWidget[]): Promise<void> => {
    await api.post('/api/dashboard/widgets/layout', { widgets });
  },
};
