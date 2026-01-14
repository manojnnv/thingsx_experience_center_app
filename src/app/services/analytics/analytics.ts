/**
 * Analytics API Services
 * 
 * Handles all API calls related to analytics and metrics.
 * Based on thingsx_ui_v2 patterns.
 * 
 * @fileoverview Analytics-related API service functions
 */

import { api } from "@/app/utils/api";
import { getSiteId } from "@/config/site";

// ===========================================
// Types
// ===========================================

export interface ProductAnalyticsDataItem {
  DATE: string;
  "HOUR(24hr)": string;
  "ZONE NAME": string;
  "BAG COUNT"?: number;
  "ACCESSORIES COUNT"?: number;
  "BRAND COUNT"?: number;
  "SHOE COUNT"?: number;
  [key: string]: string | number | undefined;
}

export interface SensorMetricData {
  tin: string;
  value: number;
  unit: string;
  timestamp: string;
}

// ===========================================
// Device & Sensor APIs
// ===========================================

/**
 * Get all device TINs by device code
 */
async function getAllDeviceTin(
  siteId: string,
  deviceCode: string
): Promise<{ data: { tin: string; name: string }[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/site/devices-by-device-code", {
      site_id: siteId || getSiteId(),
      device_code: deviceCode,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error fetching device TINs:", error);
    return { data: null, error: "Failed to fetch devices" };
  }
}

/**
 * Fetch sensor metric data
 */
async function fetchSensorMetricData(
  siteId: string,
  tins: string[],
  startDate?: string,
  endDate?: string
): Promise<{ data: SensorMetricData[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/device/metrics", {
      site_id: siteId || getSiteId(),
      tins: tins,
      start_date: startDate,
      end_date: endDate,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error fetching sensor metrics:", error);
    return { data: null, error: "Failed to fetch sensor data" };
  }
}

// ===========================================
// Product Analytics APIs
// ===========================================

/**
 * Fetch product analytics
 */
async function retrieveProductAnalytics(
  field: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: ProductAnalyticsDataItem[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/analytics", {
      site_id: getSiteId(),
      start_date: startDate,
      end_date: endDate,
      type: field,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error fetching product analytics:", error);
    return { data: null, error: "Failed to fetch product analytics" };
  }
}

export {
  getAllDeviceTin,
  fetchSensorMetricData,
  retrieveProductAnalytics,
};
