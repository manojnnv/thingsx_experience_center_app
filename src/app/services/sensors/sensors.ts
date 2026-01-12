/**
 * Sensors & Endnodes API Services
 * 
 * APIs for device retrieval, metrics, and configuration
 * Uses Axios client from api.ts
 */

import { api } from "@/app/utils/api";
import { sensorsDeviceTins, getSensorTins, DeviceConfig, categoryConfig } from "@/config/devices";
import { toast } from "sonner";

// Types
export interface DeviceFromAPI {
  tin: string;
  device_name: string;
  device_type: string;
  device_code?: string;
  status?: string;
  zone_id?: string;
  zone_name?: string;
  ref_tin?: string;
  last_seen?: string;
}

export interface Device {
  tin: string;
  name: string;
  type: string;
  category: string;
  status: "online" | "offline";
  lastReading?: number;
  unit: string;
  lastSeen?: string;
}

export interface DeviceDetails {
  tin: string;
  device_name: string;
  device_type: string;
  device_category?: string;
  status: "online" | "offline";
  last_seen?: string;
  config?: Record<string, unknown>;
}

export interface SensorMetric {
  timestamp: string;
  value: number;
  unit?: string;
}

export interface TreeViewNode {
  id: string;
  name: string;
  type: "gateway" | "endnode" | "sensor";
  children?: TreeViewNode[];
}

/**
 * Fetch all devices from API and filter by configured TINs
 */
export const fetchConfiguredDevices = async (): Promise<Device[]> => {
  try {
    const resp = await api.post("/v1/device/retrieval", {
      org_id: localStorage.getItem("org_id"),
    });

    const allDevices: DeviceFromAPI[] = resp?.data?.data || [];
    const configuredTins = getSensorTins();

    // Filter to only include devices from our config
    const filteredDevices = allDevices.filter((device) =>
      configuredTins.includes(device.tin)
    );

    // Map to our Device type with config overrides
    return filteredDevices.map((device) => {
      const config = sensorsDeviceTins.find((c) => c.tin === device.tin);
      const category = config?.category || "sensor";
      const categoryInfo = categoryConfig[category] || { label: "Sensor", unit: "", icon: "sensor" };

      return {
        tin: device.tin,
        name: config?.displayName || device.device_name,
        type: categoryInfo.label,
        category,
        status: device.status === "online" ? "online" : "offline",
        unit: categoryInfo.unit,
        lastSeen: device.last_seen,
      };
    });
  } catch (error) {
    console.error("Error fetching devices:", error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Get device details by TIN
 */
export const getDeviceDetails = async (tin: string): Promise<DeviceDetails | null> => {
  try {
    const resp = await api.post("/v1/device/details", {
      tin,
    });
    toast.message(resp?.data?.message);
    return resp?.data?.data;
  } catch (error) {
    console.error("Error fetching device details:", error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Get device tree view (for star topology)
 */
export const getDeviceTreeView = async (): Promise<TreeViewNode[]> => {
  try {
    const resp = await api.post("/v1/device/tree-view", {
      org_id: localStorage.getItem("org_id"),
      site_id: localStorage.getItem("site_id"),
    });
    toast.message(resp?.data?.message);
    return resp?.data?.data || [];
  } catch (error) {
    console.error("Error fetching tree view:", error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Fetch sensor metrics/readings for configured devices
 */
export const fetchSensorMetrics = async (
  tins?: string[],
  startDate?: string,
  endDate?: string
): Promise<Record<string, SensorMetric[]>> => {
  try {
    // Use provided TINs or fall back to configured TINs
    const targetTins = tins || getSensorTins();

    const resp = await api.post("/v1/device/metrics", {
      site_id: localStorage.getItem("site_id"),
      tins: targetTins,
      start_date: startDate,
      end_date: endDate,
    });
    toast.message(resp?.data?.message);
    return resp?.data?.data || {};
  } catch (error) {
    console.error("Error fetching sensor metrics:", error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Get device config schema
 */
export const getDeviceConfig = async (
  tin: string
): Promise<Record<string, unknown> | null> => {
  try {
    const resp = await api.post("v1/device/config/get", {
      tin,
    });
    toast.message(resp?.data?.message);
    return resp?.data?.data?.schema;
  } catch (error) {
    console.error("Error fetching device config:", error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Update device config
 */
export const updateDeviceConfig = async (
  tin: string,
  data: Record<string, unknown>
): Promise<{ status: string; message: string }> => {
  try {
    const resp = await api.post("v1/device/config/update", {
      tin,
      data,
    });

    if (resp?.data.status === "error") {
      toast.error(resp?.data?.message);
    }
    if (resp?.data.status === "success") {
      toast.message(resp?.data?.message);
    }

    return resp?.data;
  } catch (error) {
    console.error("Error updating device config:", error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Get latest reading for a specific device
 */
export const getLatestReading = async (tin: string): Promise<SensorMetric | null> => {
  try {
    const metrics = await fetchSensorMetrics([tin]);
    const deviceMetrics = metrics[tin];
    if (deviceMetrics && deviceMetrics.length > 0) {
      return deviceMetrics[deviceMetrics.length - 1];
    }
    return null;
  } catch (error) {
    console.error("Error fetching latest reading:", error);
    return null;
  }
};

/**
 * Real-time sensor data response
 */
export interface SensorLiveReading {
  tin: string;
  value: number;
  unit: string;
  timestamp: Date;
  category: string;
  displayName: string;
}

/**
 * Poll sensor data for all configured TINs
 * Returns only sensors that have data
 * Returns { readings, error } to allow caller to handle errors gracefully
 */
export const pollSensorData = async (): Promise<{ readings: SensorLiveReading[]; error?: string }> => {
  try {
    const configuredTins = getSensorTins();
    
    if (configuredTins.length === 0) {
      return { readings: [] };
    }
    
    // Check if we have auth tokens before making the request
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      return { readings: [], error: "NOT_AUTHENTICATED" };
    }
    
    const resp = await api.post("/v1/device/metrics", {
      site_id: localStorage.getItem("site_id"),
      tins: configuredTins,
    });
    
    const metricsData = resp?.data?.data || {};
    const readings: SensorLiveReading[] = [];
    
    // Process each TIN's data
    Object.entries(metricsData).forEach(([tin, metrics]) => {
      const metricsArray = metrics as SensorMetric[];
      if (metricsArray && metricsArray.length > 0) {
        const latestMetric = metricsArray[metricsArray.length - 1];
        const config = sensorsDeviceTins.find((c) => c.tin === tin);
        const category = config?.category || "sensor";
        const categoryInfo = categoryConfig[category] || { label: "Sensor", unit: "", icon: "sensor" };
        
        readings.push({
          tin,
          value: latestMetric.value,
          unit: latestMetric.unit || categoryInfo.unit,
          timestamp: new Date(latestMetric.timestamp),
          category,
          displayName: config?.displayName || tin,
        });
      }
    });
    
    return { readings };
  } catch (error: unknown) {
    // Handle specific error types
    const axiosError = error as { response?: { status?: number } };
    if (axiosError?.response?.status === 401) {
      return { readings: [], error: "NOT_AUTHENTICATED" };
    }
    if (axiosError?.response?.status === 403) {
      return { readings: [], error: "FORBIDDEN" };
    }
    // For other errors, return generic error
    return { readings: [], error: "API_ERROR" };
  }
};

/**
 * Poll dashboard sensor metrics (alternative endpoint)
 * This gets all sensor readings for the site
 */
export const pollDashboardSensorMetrics = async (): Promise<SensorLiveReading[]> => {
  try {
    const resp = await api.post("/v1/dashboard/sensor-readings/metrics", {
      org_id: localStorage.getItem("org_id"),
      site_id: localStorage.getItem("site_id"),
    });
    
    const data = resp?.data?.data || [];
    const configuredTins = getSensorTins();
    const readings: SensorLiveReading[] = [];
    
    // Filter to only configured TINs
    data.forEach((item: { tin: string; value: number; timestamp: string; unit?: string }) => {
      if (configuredTins.includes(item.tin)) {
        const config = sensorsDeviceTins.find((c) => c.tin === item.tin);
        const category = config?.category || "sensor";
        const categoryInfo = categoryConfig[category] || { label: "Sensor", unit: "", icon: "sensor" };
        
        readings.push({
          tin: item.tin,
          value: item.value,
          unit: item.unit || categoryInfo.unit,
          timestamp: new Date(item.timestamp),
          category,
          displayName: config?.displayName || item.tin,
        });
      }
    });
    
    return readings;
  } catch (error) {
    console.error("Error polling dashboard metrics:", error);
    return [];
  }
};
