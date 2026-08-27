"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useExperienceState } from "@/hooks/useExperienceState";
import { useSetQueryParam } from "@/hooks/useSetQueryParam";
import { colors } from "@/config/theme";
import {
  sensorsDeviceTins,
  sensorConfigByTin,
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
import { ExperienceErrorBoundary } from "@/app/component/ExperienceErrorBoundary";

// Constants
const ACTIVE_POLL_INTERVAL_MS = 4000; // Poll live data every 4 seconds when active
const INACTIVE_POLL_INTERVAL_MS = 10000; // Poll live data every 10 seconds when backgrounded
const STALE_THRESHOLD_MS = 300000; // Sensor considered inactive if no data in 5 minutes
const MISS_THRESHOLD = 7; // Remove sensor after 6 consecutive empty polls (~28s)

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
  // Consecutive-miss counter per TIN — sensor removed only after MISS_THRESHOLD consecutive empty polls
  const missCountRef = useRef<Map<string, number>>(new Map());

  // Ref to track when we're intentionally closing the sheet (to prevent race condition)
  const isClosingRef = useRef(false);

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stable TINs ref for polling — avoids re-mounting the polling effect when
  // device metadata changes. Updated once after initial device load.
  const pollTinsRef = useRef<string[]>([]);
  // Stable flag that flips once after initial device load — prevents polling effect restarts
  const [devicesLoaded, setDevicesLoaded] = useState(false);

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
      const tins = sensorsDeviceTins.map((c) => c.tin);
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const [apiDevicesResult, metricsResult] = await Promise.all([
        fetchDevicesByDeviceCodes(deviceCodes),
        fetchSensorMetrics(tins, start.toISOString(), end.toISOString()),
      ]);
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
      let metricsByTin: Record<string, { timestamp: string; value: number; unit?: string }[]> = {};
      let iconsByTin: Record<string, string> = {};
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
      // Signal that devices are loaded — starts the polling effect exactly once
      setDevicesLoaded(true);
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

  // ─── Live Data Polling (4-second interval) ─────────────────────────
  useEffect(() => {
    if (!devicesLoaded || pollTinsRef.current.length === 0) return;

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;
    let abortController: AbortController | null = null;

    const doPollContent = async () => {
      // Abort any previous in-flight request to prevent overlapping responses
      if (abortController) abortController.abort();
      const controller = new AbortController();
      abortController = controller;

      const tins = pollTinsRef.current;
      const result = await fetchLatestSensorData(tins, controller.signal);
      if (cancelled || controller.signal.aborted || abortController !== controller) return;
      if (result.error || !result.data) return;

      const payload = result.data;
      const now = Date.now();

      // Build a VALUE-ONLY fingerprint per TIN — timestamp changes alone
      // do NOT trigger re-renders (key anti-flicker measure).
      let hasChanges = false;
      const nextFingerprints = new Map<string, string>();
      // Track which TINs the API returned data for this cycle
      const presentTins = new Set<string>();

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
        const config = sensorConfigByTin.get(tin);
        if (!config) return;

        const category = config.category || "sensor";
        const catInfo = categoryConfig[category] || { label: "Sensor", unit: "" };

        const metricEntries = Object.entries(metrics);
        if (metricEntries.length === 0) return;

        // Mark this TIN as present — reset its miss counter
        presentTins.add(tin);
        missCountRef.current.delete(tin);

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

        // VALUE-ONLY fingerprint — excludes timestamp so identical readings
        // across polls don't trigger re-renders
        const fpParts = Object.entries(fields)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, f]) => `${k}:${f.value.toFixed(4)}`);
        const primaryFp = primaryValue !== null ? primaryValue.toFixed(4) : "invalid";
        const fp = `${primaryFp};${fpParts.join(";")}`;
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

      // ── Consecutive-miss logic ──────────────────────────────────────
      // For TINs that were previously tracked but NOT in this API response,
      // increment their miss counter. Only remove after MISS_THRESHOLD
      // consecutive misses (~20s). This prevents single-poll hiccups from
      // causing sensors to flash in/out.
      const tinsToRemove = new Set<string>();
      lastValuesRef.current.forEach((_, tin) => {
        if (!presentTins.has(tin)) {
          const currentMisses = (missCountRef.current.get(tin) || 0) + 1;
          missCountRef.current.set(tin, currentMisses);
          if (currentMisses >= MISS_THRESHOLD) {
            tinsToRemove.add(tin);
            missCountRef.current.delete(tin);
            hasChanges = true;
          }
        }
      });

      if (!hasChanges && tinsToRemove.size === 0) return;

      // Commit fingerprints (remove entries for TINs being removed)
      tinsToRemove.forEach((tin) => nextFingerprints.delete(tin));
      // Preserve fingerprints for TINs that are still tracked but missed this cycle
      lastValuesRef.current.forEach((fp, tin) => {
        if (!nextFingerprints.has(tin) && !tinsToRemove.has(tin)) {
          nextFingerprints.set(tin, fp);
        }
      });
      lastValuesRef.current = nextFingerprints;

      // Surgical merge: only create new SensorLiveData objects for TINs whose
      // fingerprint actually changed, preserving old values when incoming is absent.
      setConnectedSensors((prev) => {
        let mapChanged = false;
        const updated = new Map(prev);

        // Stale-threshold cleanup: if a sensor hasn't been seen by the API
        // AND its last received timestamp is older than STALE_THRESHOLD_MS,
        // add it to the removal set.
        prev.forEach((sensorData, tin) => {
          if (!presentTins.has(tin) && !tinsToRemove.has(tin)) {
            if (now - sensorData.lastReceivedAt.getTime() >= STALE_THRESHOLD_MS) {
              tinsToRemove.add(tin);
              missCountRef.current.delete(tin);
              // Also clean up fingerprint
              nextFingerprints.delete(tin);
            }
          }
        });

        newEntries.forEach((entry) => {
          const existing = prev.get(entry.tin);
          const history = existing?.history || [];
          const isActive = now - entry.timestamp.getTime() < STALE_THRESHOLD_MS;
          const entryValue = entry.value !== null ? entry.value : (existing?.value ?? null);
          const newHistory =
            isActive && entryValue !== null
              ? [...history, entryValue].slice(-30)
              : history;
          const mergedFields = entry.fields
            ? { ...(existing?.fields || {}), ...entry.fields }
            : existing?.fields;
          const mergedValueDisplay = entry.valueDisplay ?? existing?.valueDisplay;

          // Preserve identity if data hasn't changed
          if (
            existing &&
            existing.value === entryValue &&
            existing.lastReceivedAt.getTime() === entry.timestamp.getTime() &&
            existing.history.length === newHistory.length &&
            existing.unit === entry.unit &&
            existing.valueDisplay === mergedValueDisplay
          ) {
            return;
          }

          mapChanged = true;
          updated.set(entry.tin, {
            tin: entry.tin,
            value: entryValue,
            unit: entry.unit,
            displayName: entry.displayName,
            category: entry.category,
            lastReceivedAt: entry.timestamp,
            history: newHistory,
            fields: mergedFields,
            valueDisplay: mergedValueDisplay,
          });
        });

        // Remove TINs that exceeded MISS_THRESHOLD or STALE_THRESHOLD
        tinsToRemove.forEach((tin) => {
          if (updated.has(tin)) {
            updated.delete(tin);
            mapChanged = true;
          }
        });

        return mapChanged ? updated : prev;
      });
    };

    const poll = () => {
      if (cancelled) return;
      const interval = document.visibilityState === "visible" ? ACTIVE_POLL_INTERVAL_MS : INACTIVE_POLL_INTERVAL_MS;
      timeoutId = setTimeout(poll, interval);
      void doPollContent();
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
  }, [devicesLoaded]);

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
    <ExperienceErrorBoundary>
      <Suspense fallback={<SensorsPageFallback />}>
        <SensorsPageContent />
      </Suspense>
    </ExperienceErrorBoundary>
  );
}
