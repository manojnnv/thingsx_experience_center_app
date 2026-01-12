/**
 * Dashboard Service
 * Handles dashboard-related API calls
 */

import { get, post } from '../../utils/api';

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
    return get<DashboardStats>('/api/dashboard/stats');
  },

  /**
   * Get dashboard widgets configuration
   */
  getWidgets: async (): Promise<DashboardWidget[]> => {
    return get<DashboardWidget[]>('/api/dashboard/widgets');
  },

  /**
   * Update dashboard widget layout
   */
  updateWidgetLayout: async (widgets: DashboardWidget[]): Promise<void> => {
    return post('/api/dashboard/widgets/layout', { widgets });
  },
};
