/**
 * Sensors & Endnodes API Services
 * 
 * APIs for device retrieval, metrics, and configuration
 * Uses Axios client from api.ts
 */

import { api } from "@/app/utils/api";
import { sensorsDeviceTins, getSensorTins, categoryConfig, categoryToLogo, LOGOS_BASE } from "@/config/devices";
import { toast } from "sonner";
import { fail, getErrorMessage, ok, ServiceResult } from "@/app/services/serviceUtils";

// Types
export interface DeviceFromAPI {
  tin: string;
  device_name: string;
  device_type: string;
  device_code?: string;
  device_icon?: string;
  status?: string;
  zone_id?: string;
  zone_name?: string;
  ref_tin?: string;
  last_seen?: string;
}

export interface DeviceByCode {
  tin: string;
  device_name: string;
  device_type: string;
  device_icon?: string;
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
  /** When metric is a color (e.g. Addressable RGB), hex string for display */
  rawValue?: string;
  /** Metric name from API (e.g. "roll", "pitch") for multi-metric devices */
  metric?: string;
}

export interface MetricRecord {
  Tin: string;
  "Device Code"?: string;
  "Device Type"?: string;
  "Device Name"?: string;
  "Device Icon"?: string;
  Location?: string;
  Metric?: string;
  Value?: string;
  Time?: string;
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
export const fetchConfiguredDevices = async (): Promise<ServiceResult<Device[]>> => {
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
    const mappedDevices: Device[] = filteredDevices.map((device) => {
      const config = sensorsDeviceTins.find((c) => c.tin === device.tin);
      const category = config?.category || "sensor";
      const categoryInfo = categoryConfig[category] || { label: "Sensor", unit: "", icon: "sensor" };
      const status: Device["status"] = device.status === "online" ? "online" : "offline";
      const logoFile = categoryToLogo[category];
      const iconPath = logoFile ? `${LOGOS_BASE}/${encodeURIComponent(logoFile)}` : undefined;

      return {
        tin: device.tin,
        name: config?.displayName || device.device_name,
        type: categoryInfo.label,
        category,
        status,
        unit: categoryInfo.unit,
        lastSeen: device.last_seen,
        icon: device.device_icon ?? iconPath,
      };
    });
    return ok(mappedDevices);
  } catch (error) {
    console.error("Error fetching devices:", error);
    return fail(getErrorMessage(error, "Failed to fetch devices"));
  }
};

const normalizeCategoryKey = (deviceType?: string): string => {
  if (!deviceType) return "sensor";
  return deviceType
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

/** Threshold above which a value is treated as invalid (type-casting ghost). */
const GHOST_THRESHOLD = 1e10;

/**
 * Returns true if the raw reading is valid (finite, within bounds). Use this to decide whether to store and to append to history.
 */
export function isValidSensorReading(
  value: number,
  options?: { category?: string; metric?: string }
): boolean {
  if (value == null || !Number.isFinite(value)) return false;
  if (Math.abs(value) > GHOST_THRESHOLD) return false;
  const isLight =
    options?.category === "light" ||
    (options?.metric && /lux|light|intensity/i.test(options.metric ?? ""));
  if (isLight) {
    if (value < 0 || value > 100000) return false;
  }
  return true;
}

/**
 * Sanity-check sensor values: return a displayable number (clips light to 0–100000).
 * Only call when isValidSensorReading is true; for invalid readings store null and use last-known-good in UI.
 */
export function sanitizeSensorValue(
  value: number,
  options?: { category?: string; metric?: string }
): number {
  if (value == null || !Number.isFinite(value)) return 0;
  if (Math.abs(value) > GHOST_THRESHOLD) return 0;
  const isLight =
    options?.category === "light" ||
    (options?.metric && /lux|light|intensity/i.test(options.metric ?? ""));
  if (isLight) {
    if (value < 0) return 0;
    if (value > 100000) return 100000;
  }
  return value;
}

const parseMetricValue = (
  raw?: string,
  options?: { category?: string; metric?: string }
): { value: number | null; unit: string } => {
  if (!raw) return { value: null, unit: "" };
  const trimmed = String(raw).trim();
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?:\s*(.*))?$/);
  if (!match) return { value: null, unit: "" };
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return { value: null, unit: match[2]?.trim() || "" };
  const sanitized = sanitizeSensorValue(value, options);
  return { value: sanitized, unit: match[2]?.trim() || "" };
};

const isHexColor = (raw?: string): boolean => /^#([0-9A-Fa-f]{3}){1,2}$/.test(String(raw || "").trim());

const isColorMetric = (metric?: string, value?: string): boolean =>
  (metric && /color|colour/i.test(metric)) || isHexColor(value);

export const fetchDevicesByDeviceCode = async (
  deviceCode: string
): Promise<ServiceResult<DeviceByCode[]>> => {
  try {
    const resp = await api.post("/v1/site/devices-by-device-code", {
      site_id: localStorage.getItem("site_id"),
      device_code: deviceCode,
    });
    return ok(resp?.data?.data || []);
  } catch (error) {
    console.error("Error fetching devices by device code:", error);
    return fail(getErrorMessage(error, "Failed to fetch devices by device code"));
  }
};

export const fetchDevicesByDeviceCodes = async (
  deviceCodes: string[]
): Promise<ServiceResult<DeviceByCode[]>> => {
  const uniqueCodes = Array.from(new Set(deviceCodes.filter(Boolean)));
  const results = await Promise.all(
    uniqueCodes.map((code) => fetchDevicesByDeviceCode(code))
  );
  const errors = results.filter((result) => result.error);
  if (errors.length > 0) {
    return fail("Failed to fetch devices by device codes");
  }
  return ok(results.flatMap((result) => result.data || []));
};

export const fetchDeviceMetrics = async (
  tins: string[],
  startDate?: string,
  endDate?: string
): Promise<ServiceResult<MetricRecord[]>> => {
  try {
    const resp = await api.post("/v1/device/metrics", {
      site_id: localStorage.getItem("site_id"),
      tins,
      start_date: startDate,
      end_date: endDate,
    });
    return ok(resp?.data?.data || []);
  } catch (error) {
    console.error("Error fetching device metrics:", error);
    return fail(getErrorMessage(error, "Failed to fetch device metrics"));
  }
};

/**
 * Get device details by TIN
 */
export const getDeviceDetails = async (
  tin: string
): Promise<ServiceResult<DeviceDetails | null>> => {
  try {
    const resp = await api.post("/v1/device/details", {
      tin,
    });
    return ok(resp?.data?.data ?? null);
  } catch (error) {
    console.error("Error fetching device details:", error);
    return fail(getErrorMessage(error, "Failed to fetch device details"));
  }
};

/**
 * Get device tree view (for star topology)
 */
export const getDeviceTreeView = async (): Promise<ServiceResult<TreeViewNode[]>> => {
  try {
    const resp = await api.post("/v1/device/tree-view", {
      org_id: localStorage.getItem("org_id"),
      site_id: localStorage.getItem("site_id"),
    });
    return ok(resp?.data?.data || []);
  } catch (error) {
    console.error("Error fetching tree view:", error);
    return fail(getErrorMessage(error, "Failed to fetch tree view"));
  }
};

export type SensorMetricsResult = {
  metrics: Record<string, SensorMetric[]>;
  /** Device icon URL per TIN when returned by POST /v1/device/metrics ("Device Icon") */
  icons: Record<string, string>;
};

/**
 * Fetch sensor metrics/readings for configured devices.
 * Also extracts "Device Icon" from the metrics API when present and returns it per TIN.
 */
export const fetchSensorMetrics = async (
  tins?: string[],
  startDate?: string,
  endDate?: string
): Promise<ServiceResult<SensorMetricsResult>> => {
  try {
    const targetTins = tins || getSensorTins();
    const metricsResult = await fetchDeviceMetrics(targetTins, startDate, endDate);
    if (metricsResult.error) {
      return fail(metricsResult.error);
    }
    const metrics = metricsResult.data || [];
    const icons: Record<string, string> = {};
    /** For each TIN, keep latest row per metric (Metric name) so we get roll + pitch etc. */
    const byTinAndMetric: Record<string, Record<string, { entry: MetricRecord; parsed: { value: number | null; unit: string }; valueIsColor: boolean }>> = {};

    metrics.forEach((entry) => {
      const tin = entry.Tin;
      if (!tin) return;
      if (entry["Device Icon"] && !icons[tin]) {
        icons[tin] = entry["Device Icon"];
      }
      const parsed = parseMetricValue(entry.Value, { metric: entry.Metric });
      const valueIsColor = isColorMetric(entry.Metric, entry.Value);
      if (parsed.value === null && !valueIsColor) return;
      const metricKey = (entry.Metric || "value").trim().toLowerCase() || "value";
      const existing = byTinAndMetric[tin]?.[metricKey];
      const entryTime = entry.Time ? new Date(entry.Time).getTime() : 0;
      const existingTime = existing?.entry?.Time ? new Date(existing.entry.Time).getTime() : 0;
      if (!existing || entryTime >= existingTime) {
        if (!byTinAndMetric[tin]) byTinAndMetric[tin] = {};
        byTinAndMetric[tin][metricKey] = { entry, parsed, valueIsColor };
      }
    });

    const grouped: Record<string, SensorMetric[]> = {};
    Object.entries(byTinAndMetric).forEach(([tin, perMetric]) => {
      grouped[tin] = Object.entries(perMetric).map(([metricKey, { entry, parsed, valueIsColor }]) => ({
        timestamp: entry.Time || new Date().toISOString(),
        value: parsed.value ?? 0,
        unit: parsed.unit,
        ...(valueIsColor && entry.Value?.trim() && { rawValue: entry.Value.trim() }),
        metric: metricKey,
      }));
    });

    return ok({ metrics: grouped, icons });
  } catch (error) {
    console.error("Error fetching sensor metrics:", error);
    return fail(getErrorMessage(error, "Failed to fetch sensor metrics"));
  }
};

/**
 * Get device config schema
 */
export const getDeviceConfig = async (
  tin: string
): Promise<ServiceResult<Record<string, unknown> | null>> => {
  try {
    const resp = await api.post("v1/device/config/get", {
      tin,
    });
    return ok(resp?.data?.data?.schema ?? null);
  } catch (error) {
    console.error("Error fetching device config:", error);
    return fail(getErrorMessage(error, "Failed to fetch device config"));
  }
};

/**
 * Update device config
 */
export const updateDeviceConfig = async (
  tin: string,
  data: Record<string, unknown>
): Promise<ServiceResult<{ status?: string; message?: string }>> => {
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

    return ok(resp?.data);
  } catch (error) {
    console.error("Error updating device config:", error);
    return fail(getErrorMessage(error, "Failed to update device config"));
  }
};

/**
 * Get latest reading for a specific device
 */
export const getLatestReading = async (
  tin: string
): Promise<ServiceResult<SensorMetric | null>> => {
  try {
    const metricsResult = await fetchSensorMetrics([tin]);
    if (metricsResult.error) {
      return fail(metricsResult.error);
    }
    const deviceMetrics = metricsResult.data?.metrics?.[tin];
    if (deviceMetrics && deviceMetrics.length > 0) {
      return ok(deviceMetrics[deviceMetrics.length - 1]);
    }
    return ok(null);
  } catch (error) {
    console.error("Error fetching latest reading:", error);
    return fail(getErrorMessage(error, "Failed to fetch latest reading"));
  }
};

// ─── Live Topology Polling ─────────────────────────────────────────────

/**
 * Shape returned by POST /v1/device/latest_data
 *
 *   { "status": "success",
 *     "data": { "TIN": { "metric": { "value": number, "timestamp": "..." } } } }
 */
export type LatestDataPayload = Record<
  string, // TIN
  Record<string, { value: number; timestamp: string }>
>;

/**
 * Fetch the latest live reading for a set of TINs.
 * Uses POST /v1/device/latest_data (body: { tin: "TIN1,TIN2,..." }).
 */
export const fetchLatestSensorData = async (
  tins: string[]
): Promise<ServiceResult<LatestDataPayload>> => {
  try {
    const resp = await api.post("/v1/device/latest_data", {
      tin: tins.join(","),
    });
    if (resp?.data?.status === "success" && resp.data.data) {
      return ok(resp.data.data as LatestDataPayload);
    }
    return fail(resp?.data?.message || "Unexpected response from latest_data");
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to fetch latest sensor data"));
  }
};

