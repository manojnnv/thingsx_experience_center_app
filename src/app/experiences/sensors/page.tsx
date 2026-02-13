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
  sensorEPDDevices,
  epdColorMap,
  EPDConfig,
} from "@/config/devices";
import {
  fetchDevicesByDeviceCodes,
  fetchSensorMetrics,
  fetchLatestSensorData,
  type SensorMetric,
} from "@/app/services/sensors/sensors";
import { updateEPDValue, bulkUpdateEPD, BulkUpdatePayload } from "@/app/services/epd/epd";
import ThemedToaster from "@/app/component/app-toaster/ThemedToaster";
import VideoIntro from "@/app/component/app-experience/VideoIntro";
import SensorsHeader from "@/app/component/app-experience/SensorsHeader";
import SensorsLoading from "@/app/component/app-experience/SensorsLoading";
import SensorsGrid from "@/app/component/app-experience/SensorsGrid";
import SensorsTopology from "@/app/component/app-experience/SensorsTopology";
import SensorsEpdControl from "@/app/component/app-experience/SensorsEpdControl";
import SensorsSelectedDevicePanel from "@/app/component/app-experience/SensorsSelectedDevicePanel";
import AppSheet from "@/app/component/app-sheet/AppSheet";
import type { DisplayDevice, SensorLiveData, EPDFieldValues } from "@/app/component/app-experience/types";

// Constants
const POLL_INTERVAL_MS = 3000; // Poll live data every 3 seconds
const STALE_THRESHOLD_MS = 15000; // Sensor considered inactive if no data in 15s

const TABS = {
  grid: "Component Matrix",
  topology: "Live Topology",
  epd: "EPD Control",
} as const;

const TABS_ARRAY = Object.values(TABS);

function SensorsPageContent() {
  // Page state with persistence
  const { isReady, showVideo, skipVideo, activeTab, setActiveTab } = useExperienceState({
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

  // EPD state
  const [epdValues, setEpdValues] = useState<EPDFieldValues>({});
  const [updating, setUpdating] = useState(false);

  // Ref to track when we're intentionally closing the sheet (to prevent race condition)
  const isClosingRef = useRef(false);

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

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
        const metrics = metricsByTin[device.tin];
        const iconFromMetrics = iconsByTin[device.tin];
        const icon = device.icon ?? iconFromMetrics;
        const isLedOrRgb = device.category === "led" || device.category === "addressable_rgb";
        const colorMetric = isLedOrRgb && metrics?.length ? ([...metrics] as SensorMetric[]).reverse().find((m) => m.rawValue) : null;
        const lastReadingDisplay = colorMetric?.rawValue;
        if (metrics && metrics.length > 0) {
          const latest = metrics[metrics.length - 1];
          return {
            ...device,
            icon,
            lastReading: latest.value,
            unit: latest.unit || device.unit,
            lastReceivedAt: latest.timestamp ? new Date(latest.timestamp) : null,
            ...(lastReadingDisplay && { lastReadingDisplay }),
          };
        }
        return {
          ...device,
          icon,
          ...(lastReadingDisplay && { lastReadingDisplay }),
        };
      });

      setDevices(deviceListWithReadings);
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
  const handleSelectDevice = (device: DisplayDevice | null) => {
    setSelectedDevice(device);
    setDeviceParam(device?.tin ?? null);
  };

  // Helper to close the sheet (clears both state and URL)
  const handleCloseSheet = () => {
    isClosingRef.current = true;
    setSelectedDevice(null);
    setDeviceParam(null);
  };

  // Initialize EPD values
  useEffect(() => {
    const initialValues: EPDFieldValues = {};
    sensorEPDDevices.forEach((epd) => {
      initialValues[epd.tin] = {};
      epd.fields.forEach((field) => {
        initialValues[epd.tin][field.key] = field.defaultValue ?? "";
      });
    });
    setEpdValues(initialValues);
  }, []);

  // ─── Live Topology Polling ───────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== TABS.topology || showVideo || devices.length === 0) return;

    let cancelled = false;

    const poll = async () => {
      const tins = devices.map((d) => d.tin);
      const result = await fetchLatestSensorData(tins);
      if (cancelled || result.error || !result.data) return;

      const payload = result.data; // { TIN: { metric: { value, timestamp } } }
      const now = Date.now();

      // Build a fingerprint string per TIN so we can detect actual changes
      let hasChanges = false;
      const nextFingerprints = new Map<string, string>();

      const newEntries: Array<{
        tin: string;
        value: number;
        unit: string;
        timestamp: Date;
        category: string;
        displayName: string;
      }> = [];

      Object.entries(payload).forEach(([tin, metrics]) => {
        const config = sensorsDeviceTins.find((c) => c.tin === tin);
        if (!config) return; // not one of our configured sensors

        const category = config.category || "sensor";
        const catInfo = categoryConfig[category] || { label: "Sensor", unit: "" };

        // Pick the first metric as the primary display value
        const metricEntries = Object.entries(metrics);
        if (metricEntries.length === 0) return;

        const [, first] = metricEntries[0];
        const ts = new Date(first.timestamp);

        // Fingerprint: value rounded to 2 decimals + timestamp
        const fp = `${first.value.toFixed(2)}|${first.timestamp}`;
        nextFingerprints.set(tin, fp);

        if (lastValuesRef.current.get(tin) !== fp) {
          hasChanges = true;
        }

        newEntries.push({
          tin,
          value: first.value,
          unit: catInfo.unit,
          timestamp: ts,
          category,
          displayName: config.displayName || tin,
        });
      });

      // Also detect removals (a TIN that was present is now gone)
      lastValuesRef.current.forEach((_, tin) => {
        if (!nextFingerprints.has(tin)) hasChanges = true;
      });

      if (!hasChanges) return; // nothing changed, skip render

      // Commit fingerprints
      lastValuesRef.current = nextFingerprints;

      // Update connectedSensors map
      setConnectedSensors((prev) => {
        const updated = new Map<string, SensorLiveData>();

        newEntries.forEach((entry) => {
          const existing = prev.get(entry.tin);
          const history = existing?.history || [];
          const isActive = now - entry.timestamp.getTime() < STALE_THRESHOLD_MS;

          updated.set(entry.tin, {
            tin: entry.tin,
            value: entry.value,
            unit: entry.unit,
            displayName: entry.displayName,
            category: entry.category,
            lastReceivedAt: entry.timestamp,
            // Only append to history when the sensor is actively transmitting
            history: isActive
              ? [...history, entry.value].slice(-30)
              : history,
          });
        });

        return updated;
      });

      // Update device statuses
      setDevices((prev) => {
        let changed = false;
        const next = prev.map((device) => {
          const entry = newEntries.find((e) => e.tin === device.tin);
          if (!entry) return device;
          const isActive = now - entry.timestamp.getTime() < STALE_THRESHOLD_MS;
          const newStatus = isActive ? "online" : "offline";
          if (device.status !== newStatus || device.lastReading !== entry.value) {
            changed = true;
            return {
              ...device,
              status: newStatus as "online" | "offline",
              lastReading: entry.value,
              unit: entry.unit || device.unit,
              lastReceivedAt: entry.timestamp,
            };
          }
          return device;
        });
        return changed ? next : prev;
      });
    };

    // Initial poll immediately, then on interval
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeTab, showVideo, devices.length]); // devices.length so we re-run once devices load

  // EPD handlers
  const handleEPDFieldChange = (tin: string, fieldKey: string, value: string | number) => {
    setEpdValues((prev) => ({
      ...prev,
      [tin]: { ...prev[tin], [fieldKey]: value },
    }));
  };

  const handleUpdateSingleEPD = async (epd: EPDConfig) => {
    setUpdating(true);
    try {
      const values = epdValues[epd.tin] || {};
      await updateEPDValue(epd.tin, values);
    } finally {
      setUpdating(false);
    }
  };

  const getDeviceForSensor = (tin: string) => devices.find((d) => d.tin === tin);

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

      <VideoIntro show={showVideo} onSkip={skipVideo} />

      {/* Main Content */}
      <div className={`flex flex-col flex-1 min-h-0 ${showVideo ? "opacity-0" : "opacity-100 transition-opacity duration-500"}`}>
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
                devices={devices}
                connectedSensors={connectedSensors}
                getDeviceForSensor={getDeviceForSensor}
                onSelectDevice={handleSelectDevice}
                centralEndnode={centralEndnode}
                categoryConfig={categoryConfig}
              />
            </div>
          )}

          {/* EPD Control */}
          {!loading && activeTab === TABS.epd && (
            <SensorsEpdControl
              sensorEPDDevices={sensorEPDDevices}
              epdColorMap={epdColorMap}
              epdValues={epdValues}
              updating={updating}
              onEPDFieldChange={handleEPDFieldChange}
              onUpdateSingleEPD={handleUpdateSingleEPD}
            />
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
