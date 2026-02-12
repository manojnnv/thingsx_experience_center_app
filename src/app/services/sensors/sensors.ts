/**
 * Sensors & Endnodes API Services
 * 
 * APIs for device retrieval, metrics, and configuration
 * Uses Axios client from api.ts
 */

import { api } from "@/app/utils/api";
import { sensorsDeviceTins, getSensorTins, DeviceConfig, categoryConfig, categoryToLogo, LOGOS_BASE } from "@/config/devices";
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

const parseMetricValue = (raw?: string): { value: number | null; unit: string } => {
  if (!raw) return { value: null, unit: "" };
  const trimmed = String(raw).trim();
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(?:\s*(.*))?$/);
  if (!match) return { value: null, unit: "" };
  const value = Number(match[1]);
  return { value: Number.isFinite(value) ? value : null, unit: match[2]?.trim() || "" };
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
    const grouped: Record<string, SensorMetric[]> = {};
    const icons: Record<string, string> = {};

    metrics.forEach((entry) => {
      const tin = entry.Tin;
      if (!tin) return;
      if (entry["Device Icon"] && !icons[tin]) {
        icons[tin] = entry["Device Icon"];
      }
      const parsed = parseMetricValue(entry.Value);
      const valueIsColor = isColorMetric(entry.Metric, entry.Value);
      if (parsed.value === null && !valueIsColor) return;
      const item: SensorMetric = {
        timestamp: entry.Time || new Date().toISOString(),
        value: parsed.value ?? 0,
        unit: parsed.unit,
        ...(valueIsColor && entry.Value?.trim() && { rawValue: entry.Value.trim() }),
      };
      grouped[tin] = grouped[tin] ? [...grouped[tin], item] : [item];
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
  /** When metric is a color (e.g. Addressable RGB), hex string for display */
  valueDisplay?: string;
}

/**
 * Connect to SSE stream for live sensor data.
 *
 * Uses the Fetch API with ReadableStream to consume an SSE endpoint that
 * requires a POST body (list of TINs). The standard EventSource API only
 * supports GET, so we stream manually.
 *
 * Key points:
 * - Calls ensureAuth() before every connection attempt so the token is fresh.
 * - Sends Accept: text/event-stream and cache: no-cache for proper SSE
 *   behaviour in browsers and proxies.
 * - Parses the SSE wire format: blocks separated by blank lines, each
 *   containing one or more "data:" lines.
 */
export const connectToSensorStream = async (
  onMessage: (readings: SensorLiveReading[]) => void,
  onError: (error: string) => void,
  signal: AbortSignal
): Promise<void> => {
  const configuredTins = getSensorTins();
  // Filter out load cells and RGBs as requested
  const tinsToMonitor = configuredTins.filter((tin) => {
    const config = sensorsDeviceTins.find((c) => c.tin === tin);
    return (
      config?.category !== "load_cell" &&
      config?.category !== "addressable_rgb" &&
      config?.category !== "led"
    );
  });

  if (tinsToMonitor.length === 0) return;

  // --- Ensure we have a valid access token before connecting ----------
  const { ensureAuth } = await import("@/app/services/auth/auth");
  const authed = await ensureAuth();
  if (!authed) {
    onError("NOT_AUTHENTICATED");
    return;
  }

  const token = localStorage.getItem("access_token");
  if (!token) {
    onError("NOT_AUTHENTICATED");
    return;
  }

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://tgx-app-api.dev.intellobots.com";

  try {
    const response = await fetch(`${API_BASE}/v1/device/latest/live`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(tinsToMonitor),
      signal,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token was stale – clear it so ensureAuth() re-logs in on next retry
        localStorage.removeItem("access_token");
        onError("NOT_AUTHENTICATED");
      } else {
        onError(`HTTP Error: ${response.status}`);
      }
      return;
    }

    if (!response.body) {
      onError("No response body – streaming not supported");
      return;
    }

    // --- Read the stream --------------------------------------------------
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by blank lines (\n\n).
      // Split on that boundary, keeping the last (possibly incomplete) chunk.
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        // Each block can have multiple "data:" lines; concatenate them.
        const dataLines = block
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.substring(5).trim());

        if (dataLines.length === 0) continue;
        const jsonStr = dataLines.join("");

        try {
          const payload = JSON.parse(jsonStr);

          if (payload.status === "stream" && payload.data) {
            const readings: SensorLiveReading[] = [];

            // Parse payload.data: { TIN: { metric: { value, timestamp } } }
            Object.entries(payload.data).forEach(
              ([tin, metrics]: [string, any]) => {
                const config = sensorsDeviceTins.find((c) => c.tin === tin);
                const category = config?.category || "sensor";
                const categoryInfo = categoryConfig[category] || {
                  label: "Sensor",
                  unit: "",
                  icon: "sensor",
                };

                Object.entries(metrics).forEach(
                  ([, metricData]: [string, any]) => {
                    if (metricData?.value === undefined) return;

                    readings.push({
                      tin,
                      value: Number(metricData.value),
                      unit: categoryInfo.unit,
                      timestamp: new Date(metricData.timestamp),
                      category,
                      displayName: config?.displayName || tin,
                    });
                  }
                );
              }
            );

            if (readings.length > 0) {
              onMessage(readings);
            }
          }
        } catch (e) {
          // Silently skip malformed JSON chunks – the next event will come
          console.warn("SSE: skipped malformed event", e);
        }
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") return; // intentional teardown
    onError(err?.message || String(err));
  }
};

/**
 * Poll sensor data for all configured TINs
 * ... existing implementation ...
 */
export const pollSensorData = async (
  maxAgeMs?: number
): Promise<ServiceResult<SensorLiveReading[]>> => {
  try {
    const configuredTins = getSensorTins();

    if (configuredTins.length === 0) {
      return ok([]);
    }

    // Check if we have auth tokens before making the request
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      return fail("NOT_AUTHENTICATED");
    }

    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const metricsResult = await fetchDeviceMetrics(
      configuredTins,
      start.toISOString(),
      end.toISOString()
    );
    if (metricsResult.error) {
      return fail(metricsResult.error);
    }
    const metrics = metricsResult.data || [];
    const readings: SensorLiveReading[] = [];

    const byTin = new Map<string, MetricRecord[]>();
    metrics.forEach((entry) => {
      const tin = entry.Tin;
      if (!tin) return;
      const list = byTin.get(tin) || [];
      list.push(entry);
      byTin.set(tin, list);
    });

    const now = Date.now();
    byTin.forEach((entries, tin) => {
      const config = sensorsDeviceTins.find((c) => c.tin === tin);
      const category = config?.category || normalizeCategoryKey(entries[0]?.["Device Type"]) || "sensor";
      const categoryInfo = categoryConfig[category] || { label: "Sensor", unit: "", icon: "sensor" };
      const preferColor = category === "led" || category === "addressable_rgb";
      const colorEntry = preferColor ? entries.find((e) => isColorMetric(e.Metric, e.Value)) : null;
      const latestByTime = entries.reduce((a, b) =>
        new Date((b.Time || 0) as string).getTime() >= new Date((a.Time || 0) as string).getTime() ? b : a
      );
      const entry = colorEntry || latestByTime;
      const timestamp = new Date(entry.Time || new Date().toISOString());
      if (maxAgeMs && now - timestamp.getTime() > maxAgeMs) {
        return;
      }
      const isColor = isColorMetric(entry.Metric, entry.Value);
      const parsed = parseMetricValue(entry.Value);
      const value = parsed.value ?? 0;
      if (!isColor && parsed.value === null) return;
      readings.push({
        tin,
        value,
        unit: isColor ? "" : (parsed.unit || categoryInfo.unit),
        timestamp,
        category,
        displayName: config?.displayName || entry["Device Name"] || tin,
        ...(isColor && entry.Value?.trim() && { valueDisplay: entry.Value.trim() }),
      });
    });

    return ok(readings);
  } catch (error: unknown) {
    // Handle specific error types
    const axiosError = error as { response?: { status?: number } };
    if (axiosError?.response?.status === 401) {
      return fail("NOT_AUTHENTICATED");
    }
    if (axiosError?.response?.status === 403) {
      return fail("FORBIDDEN");
    }
    // For other errors, return generic error
    return fail("API_ERROR");
  }
};

/**
 * Poll dashboard sensor metrics (alternative endpoint)
 * This gets all sensor readings for the site
 */
export const pollDashboardSensorMetrics = async (): Promise<ServiceResult<SensorLiveReading[]>> => {
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

    return ok(readings);
  } catch (error) {
    console.error("Error polling dashboard metrics:", error);
    return fail(getErrorMessage(error, "Failed to poll dashboard metrics"));
  }
};
