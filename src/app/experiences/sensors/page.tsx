"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useExperienceState } from "@/hooks/useExperienceState";
import { useSetQueryParam } from "@/hooks/useSetQueryParam";
import { colors } from "@/config/theme";
import {
  sensorsDeviceTins,
  centralEndnode,
  categoryConfig,
  categoryToLogo,
  LOGOS_BASE,
  multiValueSensorFields,
} from "@/config/devices";
import {
  fetchDevicesByDeviceCodes,
  fetchSensorMetrics,
  fetchLatestSensorData,
  sanitizeSensorValue,
  isValidSensorReading,
  maybeDecodeSensorValue,
  type SensorMetric,
} from "@/app/services/sensors/sensors";
import ThemedToaster from "@/app/component/app-toaster/ThemedToaster";
import SensorsHeader from "@/app/component/app-experience/SensorsHeader";
import SensorsLoading from "@/app/component/app-experience/SensorsLoading";
import SensorsGrid from "@/app/component/app-experience/SensorsGrid";
import SensorsTopology from "@/app/component/app-experience/SensorsTopology";
import SensorsSelectedDevicePanel from "@/app/component/app-experience/SensorsSelectedDevicePanel";
import AppSheet from "@/app/component/app-sheet/AppSheet";
import type { DisplayDevice, SensorLiveData } from "@/app/component/app-experience/types";
import VideoLibraryButton from "@/app/component/app-video-library/VideoLibraryButton";

// Constants
const ACTIVE_POLL_INTERVAL_MS = 2000; // Poll live data every 2 seconds when active
const INACTIVE_POLL_INTERVAL_MS = 10000; // Poll live data every 10 seconds when backgrounded
const STALE_THRESHOLD_MS = 300000; // Sensor considered inactive if no data in 5 minutes

const TABS = {
  grid: "Component Matrix",
  topology: "Live Topology",
} as const;

const TABS_ARRAY = Object.values(TABS);

function SensorsPageContent() {
  // Page state with persistence
  const { isReady, activeTab, setActiveTab } = useExperienceState({
    pageKey: "sensors",
    tabs: TABS_ARRAY,
    defaultTab: TABS.grid,
  });
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<DisplayDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DisplayDevice | null>(null);

  // URL-based device selection for sheet persistence
  const [deviceParam, setDeviceParam] = useSetQueryParam("device");

  // Topology state
  const [connectedSensors, setConnectedSensors] = useState<Map<string, SensorLiveData>>(new Map());
  // Snapshot of last committed values — avoids re-renders when API returns the same data
  const lastValuesRef = useRef<Map<string, string>>(new Map());

  // Ref to track when we're intentionally closing the sheet (to prevent race condition)
  const isClosingRef = useRef(false);

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stable TINs ref for polling — avoids re-mounting the polling effect when
  // device metadata changes. Updated once after initial device load.
  const pollTinsRef = useRef<string[]>([]);

  // Initialize devices from config
  const loadDevices = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const deviceCodes = Array.from(
        new Set(sensorsDeviceTins.map((config) => config.tin.slice(0, 6)))
      );
      const apiDevicesResult = await fetchDevicesByDeviceCodes(deviceCodes);
      if (apiDevicesResult.error) {
        console.warn("Failed to load device metadata:", apiDevicesResult.error);
      }
      const apiDevices = apiDevicesResult.data || [];
      const apiByTin = new Map(apiDevices.map((d) => [d.tin, d]));

      const normalizeCategoryKey = (deviceType?: string) => {
        if (!deviceType) return "sensor";
        return deviceType
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
      };

      const deviceList: DisplayDevice[] = sensorsDeviceTins.map((config) => {
        const apiDevice = apiByTin.get(config.tin);
        const category =
          config.category || normalizeCategoryKey(apiDevice?.device_type) || "sensor";
        const categoryInfo =
          categoryConfig[category] || { label: "Sensor", unit: "", icon: "sensor" };
        const logoFile = categoryToLogo[category];
        const iconPath = logoFile ? `${LOGOS_BASE}/${encodeURIComponent(logoFile)}` : undefined;
        return {
          tin: config.tin,
          name: config.displayName || apiDevice?.device_name || "Sensor",
          type: apiDevice?.device_type ?? categoryInfo.label,
          category,
          status: "offline",
          lastReading: null,
          unit: categoryInfo.unit,
          icon: iconPath ?? apiDevice?.device_icon,
        };
      });
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      let metricsByTin: Record<string, { timestamp: string; value: number; unit?: string }[]> = {};
      let iconsByTin: Record<string, string> = {};
      const metricsResult = await fetchSensorMetrics(
        deviceList.map((device) => device.tin),
        start.toISOString(),
        end.toISOString()
      );
      if (metricsResult.error) {
        console.warn("Failed to load sensor metrics:", metricsResult.error);
      } else {
        metricsByTin = metricsResult.data?.metrics || {};
        iconsByTin = metricsResult.data?.icons || {};
      }

      const deviceListWithReadings = deviceList.map((device) => {
        const metrics = metricsByTin[device.tin] as (SensorMetric & { metric?: string })[] | undefined;
        const iconFromMetrics = iconsByTin[device.tin];
        const icon = device.icon ?? iconFromMetrics;
        const isLedOrRgb = device.category === "led" || device.category === "addressable_rgb";
        const colorMetric = isLedOrRgb && metrics?.length ? ([...metrics] as SensorMetric[]).reverse().find((m) => m.rawValue) : null;
        const lastReadingDisplay = colorMetric?.rawValue;
        if (metrics && metrics.length > 0) {
          const withMetricNames = metrics.filter((m) => m.metric);
          const fieldsFromMetrics =
            withMetricNames.length > 0
              ? Object.fromEntries(
                withMetricNames.map((m) => [
                  m.metric!,
                  { value: m.value, timestamp: m.timestamp },
                ])
              )
              : undefined;
          const primary = metrics[0];
          return {
            ...device,
            icon,
            lastReading: primary.value,
            unit: primary.unit || device.unit,
            lastReceivedAt: primary.timestamp ? new Date(primary.timestamp) : null,
            ...(lastReadingDisplay && { lastReadingDisplay }),
            ...(fieldsFromMetrics && Object.keys(fieldsFromMetrics).length > 0 && { fields: fieldsFromMetrics }),
          };
        }
        return {
          ...device,
          icon,
          ...(lastReadingDisplay && { lastReadingDisplay }),
        };
      });

      setDevices(deviceListWithReadings);
      // Populate stable TINs ref for polling, excluding load_cell and addressable_rgb
      pollTinsRef.current = deviceListWithReadings
        .filter((d) => d.category !== "load_cell" && d.category !== "addressable_rgb")
        .map((d) => d.tin);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Refresh function for manual data refresh
  const refreshDevices = React.useCallback(() => {
    loadDevices(true);
  }, [loadDevices]);

  // Auto-open device sheet if ?device= is present in URL after devices load
  useEffect(() => {
    // Skip if we're intentionally closing
    if (isClosingRef.current) {
      isClosingRef.current = false;
      return;
    }
    if (!deviceParam || devices.length === 0) return;
    // If sheet is already open for this device, skip
    if (selectedDevice?.tin === deviceParam) return;

    const found = devices.find((d) => d.tin === deviceParam);
    if (found) {
      setSelectedDevice(found);
    }
  }, [deviceParam, devices, selectedDevice?.tin]);

  // Helper to select a device (updates both state and URL)
  const handleSelectDevice = React.useCallback((device: DisplayDevice | null) => {
    setSelectedDevice(device);
    setDeviceParam(device?.tin ?? null);
  }, [setDeviceParam]);

  // Helper to close the sheet (clears both state and URL)
  const handleCloseSheet = () => {
    isClosingRef.current = true;
    setSelectedDevice(null);
    setDeviceParam(null);
  };

  // ─── Live Topology Polling ───────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== TABS.topology || pollTinsRef.current.length === 0) return;

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;
    let abortController: AbortController | null = null;

    const doPollContent = async () => {
      // Abort any previous in-flight request to prevent overlapping responses
      if (abortController) abortController.abort();
      abortController = new AbortController();

      const tins = pollTinsRef.current;
      const result = await fetchLatestSensorData(tins);
      if (cancelled || result.error || !result.data) return;

      const payload = result.data;
      const now = Date.now();

      // Build a fingerprint string per TIN so we can detect actual changes
      let hasChanges = false;
      const nextFingerprints = new Map<string, string>();

      const newEntries: Array<{
        tin: string;
        value: number | null;
        unit: string;
        timestamp: Date;
        category: string;
        displayName: string;
        fields?: Record<string, { value: number; timestamp?: string }>;
        valueDisplay?: string;
      }> = [];

      Object.entries(payload).forEach(([tin, metrics]) => {
        const config = sensorsDeviceTins.find((c) => c.tin === tin);
        if (!config) return;

        const category = config.category || "sensor";
        const catInfo = categoryConfig[category] || { label: "Sensor", unit: "" };

        const metricEntries = Object.entries(metrics);
        if (metricEntries.length === 0) return;

        const sanitizeOpts = { category, metric: "" };
        const toNum = (v: unknown) => (typeof v === "number" ? v : Number(v));
        const fields: Record<string, { value: number; timestamp?: string }> = {};
        metricEntries.forEach(([key, m]) => {
          const rawVal = toNum((m as { value?: unknown }).value);
          const numVal = Number.isFinite(rawVal) ? rawVal : 0;
          // Decode raw sensor value if needed (e.g. uint32→float32 for MICS-5524)
          const decodedVal = maybeDecodeSensorValue(numVal, category);
          const value = isValidSensorReading(decodedVal, { ...sanitizeOpts, metric: key })
            ? sanitizeSensorValue(decodedVal, { ...sanitizeOpts, metric: key })
            : 0;
          fields[key] = { value, timestamp: m.timestamp };
        });

        // For multi-value sensors, rename generic API metric keys (e.g. "value")
        // to match the configured field definitions (e.g. "ethanol_ppm") by position.
        const mvFieldDefs = multiValueSensorFields[category];
        if (mvFieldDefs && Object.keys(fields).length > 0) {
          const apiKeys = Object.keys(fields);
          const renamed: Record<string, { value: number; timestamp?: string }> = {};
          apiKeys.forEach((apiKey, index) => {
            const newKey = mvFieldDefs[index]?.key ?? apiKey;
            renamed[newKey] = fields[apiKey];
          });
          for (const k of apiKeys) delete fields[k];
          Object.assign(fields, renamed);
        }

        const [firstKey, first] = metricEntries[0];
        const firstRaw = toNum((first as { value?: unknown }).value);
        const firstNum = Number.isFinite(firstRaw) ? firstRaw : 0;
        // Decode raw sensor value if needed (e.g. uint32→float32 for MICS-5524)
        const firstDecoded = maybeDecodeSensorValue(firstNum, category);
        const primaryValid = isValidSensorReading(firstDecoded, { ...sanitizeOpts, metric: firstKey });
        const primaryValue: number | null = primaryValid
          ? sanitizeSensorValue(firstDecoded, { ...sanitizeOpts, metric: firstKey })
          : null;
        const ts = new Date(first.timestamp.replace(" ", "T"));

        // Fingerprint
        const fpParts = Object.entries(fields)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, f]) => `${f.value.toFixed(4)}|${first.timestamp}`);
        const primaryFp = primaryValue !== null ? primaryValue.toFixed(4) : "invalid";
        const fp = `${primaryFp}|${first.timestamp};${fpParts.join(";")}`;
        nextFingerprints.set(tin, fp);

        if (lastValuesRef.current.get(tin) !== fp) {
          hasChanges = true;
        }

        // Hex color for LED/RGB
        let valueDisplay: string | undefined;
        for (const [, m] of metricEntries) {
          const raw = String((m as any).value ?? "");
          if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(raw.trim())) {
            valueDisplay = raw.trim();
            break;
          }
        }

        newEntries.push({
          tin,
          value: primaryValue,
          unit: catInfo.unit,
          timestamp: ts,
          category,
          displayName: config.displayName || tin,
          fields: Object.keys(fields).length > 0 ? fields : undefined,
          valueDisplay,
        });
      });

      // Detect removals
      lastValuesRef.current.forEach((_, tin) => {
        if (!nextFingerprints.has(tin)) hasChanges = true;
      });

      if (!hasChanges) return;

      // Commit fingerprints
      lastValuesRef.current = nextFingerprints;

      // Surgical merge: only create new SensorLiveData objects for TINs whose
      // fingerprint actually changed.
      setConnectedSensors((prev) => {
        let mapChanged = false;
        const updated = new Map(prev);

        newEntries.forEach((entry) => {
          const existing = prev.get(entry.tin);
          const history = existing?.history || [];
          const isActive = now - entry.timestamp.getTime() < STALE_THRESHOLD_MS;
          const newHistory =
            isActive && entry.value !== null
              ? [...history, entry.value].slice(-30)
              : history;

          // Preserve identity if data hasn't changed
          if (
            existing &&
            existing.value === entry.value &&
            existing.lastReceivedAt.getTime() === entry.timestamp.getTime() &&
            existing.history.length === newHistory.length &&
            existing.unit === entry.unit
          ) {
            return;
          }

          mapChanged = true;
          updated.set(entry.tin, {
            tin: entry.tin,
            value: entry.value,
            unit: entry.unit,
            displayName: entry.displayName,
            category: entry.category,
            lastReceivedAt: entry.timestamp,
            history: newHistory,
            fields: entry.fields,
            valueDisplay: entry.valueDisplay,
          });
        });

        // Remove TINs no longer present
        prev.forEach((_, tin) => {
          if (!nextFingerprints.has(tin)) {
            updated.delete(tin);
            mapChanged = true;
          }
        });

        return mapChanged ? updated : prev;
      });
    };

    const poll = async () => {
      await doPollContent();
      if (!cancelled) {
        const interval = document.visibilityState === "visible" ? ACTIVE_POLL_INTERVAL_MS : INACTIVE_POLL_INTERVAL_MS;
        timeoutId = setTimeout(poll, interval);
      }
    };

    // Initial poll immediately
    poll();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timeoutId);
        if (!cancelled) {
          poll();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (abortController) abortController.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeTab, devices.length]);

  // O(1) lookup map — stable reference as long as `devices` doesn't change
  const devicesByTin = React.useMemo(
    () => new Map(devices.map((d) => [d.tin, d])),
    [devices]
  );
  const getDeviceForSensor = React.useCallback(
    (tin: string) => devicesByTin.get(tin),
    [devicesByTin]
  );

  // Pre-filtered device list for topology — avoids creating new array on every render
  const topologyDevices = React.useMemo(
    () => devices.filter((d) => d.category !== "load_cell" && d.category !== "addressable_rgb"),
    [devices]
  );

  // Show minimal loading state until localStorage check is complete
  if (!isReady) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: colors.background }}
      />
    );
  }

  return (
    <div
      className="h-screen text-white relative flex flex-col overflow-hidden"
      style={{ backgroundColor: colors.background }}
    >
      <ThemedToaster accentColor={colors.sensorAccent} />

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-h-0">
        <SensorsHeader
          tabs={TABS_ARRAY}
          activeTab={activeTab}
          defaultTab={TABS.grid}
          onTabChange={(tab) => setActiveTab(tab)}
          accentColor={colors.sensorAccent}
          onRefresh={refreshDevices}
          isRefreshing={isRefreshing}
        />

        {/* Content Area */}
        <main className="px-8 py-2 flex-1 min-h-0">
          <SensorsLoading loading={loading} />

          {/* Component Matrix Grid */}
          {!loading && activeTab === TABS.grid && (
            <SensorsGrid
              devices={devices}
              connectedSensors={connectedSensors}
              selectedDevice={selectedDevice}
              onSelectDevice={handleSelectDevice}
              onClose={handleCloseSheet}
              centralEndnode={centralEndnode}
            />
          )}

          {/* Dynamic Live Topology */}
          {!loading && activeTab === TABS.topology && (
            <div className="h-full">
              <SensorsTopology
                devices={topologyDevices}
                connectedSensors={connectedSensors}
                getDeviceForSensor={getDeviceForSensor}
                onSelectDevice={handleSelectDevice}
                centralEndnode={centralEndnode}
                categoryConfig={categoryConfig}
              />
            </div>
          )}
        </main>

        {/* Selected Device Panel (Topology) */}
        {selectedDevice && activeTab === TABS.topology && (
          <AppSheet
            open={Boolean(selectedDevice)}
            onOpenChange={(open) => {
              if (!open) {
                handleCloseSheet();
              }
            }}
            title="Device Details"
            id={selectedDevice?.tin}
            accentColor={colors.yellow}
          >
            <SensorsSelectedDevicePanel
              selectedDevice={selectedDevice}
              connectedSensors={connectedSensors}
              centralEndnode={centralEndnode}
              onClose={handleCloseSheet}
            />
          </AppSheet>
        )}
      </div>
      <VideoLibraryButton />
    </div>
  );
}

// Fallback shown during prerender / while search params are not yet available
function SensorsPageFallback() {
  return (
    <div
      className="min-h-screen text-white relative flex items-center justify-center"
      style={{ backgroundColor: colors.background }}
    >
      <span style={{ color: colors.textMuted }}>Loading...</span>
    </div>
  );
}

export default function SensorsPage() {
  return (
    <Suspense fallback={<SensorsPageFallback />}>
      <SensorsPageContent />
    </Suspense>
  );
}
