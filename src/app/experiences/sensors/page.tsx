"use client";

import React, { useState, useEffect, useRef } from "react";
import { colors } from "@/config/theme";
import { 
  sensorsDeviceTins, 
  centralEndnode,
  categoryConfig,
  sensorEPDDevices,
  epdColorMap,
  EPDConfig,
} from "@/config/devices";
import { pollSensorData, SensorLiveReading } from "@/app/services/sensors/sensors";
import { updateEPDValue, bulkUpdateEPD, BulkUpdatePayload } from "@/app/services/epd/epd";
import { Toaster } from "sonner";
import { useAuth } from "@/app/providers/AuthProvider";
import SensorsVideoIntro from "@/app/component/app-sensors/SensorsVideoIntro";
import SensorsHeader from "@/app/component/app-sensors/SensorsHeader";
import SensorsLoading from "@/app/component/app-sensors/SensorsLoading";
import SensorsGrid from "@/app/component/app-sensors/SensorsGrid";
import SensorsTopology from "@/app/component/app-sensors/SensorsTopology";
import SensorsEpdControl from "@/app/component/app-sensors/SensorsEpdControl";
import SensorsSelectedDevicePanel from "@/app/component/app-sensors/SensorsSelectedDevicePanel";
import type { DisplayDevice, SensorLiveData, EPDFieldValues } from "@/app/component/app-sensors/types";

// Constants
const SENSOR_TIMEOUT_MS = 10000; // 10 seconds
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const TABS = {
  grid: "Component Matrix",
  topology: "Live Topology",
  epd: "EPD Control",
} as const;

function Page() {
  // Auth state
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Page state
  const [showVideo, setShowVideo] = useState(true);
  type ActiveTab = (typeof TABS)[keyof typeof TABS];
  const [activeTab, setActiveTab] = useState<ActiveTab>(TABS.grid);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<DisplayDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DisplayDevice | null>(null);
  
  // Topology state
  const [connectedSensors, setConnectedSensors] = useState<Map<string, SensorLiveData>>(new Map());
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  
  // EPD state
  const [epdValues, setEpdValues] = useState<EPDFieldValues>({});
  const [updating, setUpdating] = useState(false);
  
  // Refs for intervals
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize devices from config
  useEffect(() => {
    const loadDevices = async () => {
      setLoading(true);
      try {
        const deviceList: DisplayDevice[] = sensorsDeviceTins.map((config) => {
          const category = config.category || "sensor";
          const categoryInfo = categoryConfig[category] || { label: "Sensor", unit: "", icon: "sensor" };
          return {
            tin: config.tin,
            name: config.displayName || "Sensor",
            type: categoryInfo.label,
            category,
            status: "offline",
            lastReading: 0,
            unit: categoryInfo.unit,
          };
        });
        setDevices(deviceList);
      } finally {
        setLoading(false);
      }
    };
    loadDevices();
  }, []);

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

  // Poll for real sensor data
  const pollForData = async () => {
    setIsPolling(true);
    const { readings, error } = await pollSensorData();
    
    if (error) {
      setPollingError("Connection error. Retrying...");
      setIsPolling(false);
      return;
    }
    
    setPollingError(null);
    setLastPollTime(new Date());
    
    if (readings.length > 0) {
      setConnectedSensors((prev) => {
        const updated = new Map(prev);
        
        readings.forEach((reading) => {
          const existing = updated.get(reading.tin);
          const history = existing?.history || [];
          
          updated.set(reading.tin, {
            tin: reading.tin,
            value: reading.value,
            unit: reading.unit,
            displayName: reading.displayName,
            category: reading.category,
            lastReceivedAt: new Date(),
            history: [...history, reading.value].slice(-30),
          });
        });
        
        return updated;
      });
      
      // Update device status
      setDevices((prev) =>
        prev.map((device) => {
          const reading = readings.find((r) => r.tin === device.tin);
          if (reading) {
            return { ...device, status: "online", lastReading: reading.value };
          }
          return device;
        })
      );
    }
    
    setIsPolling(false);
  };

  // Cleanup disconnected sensors
  const cleanupDisconnectedSensors = () => {
    const now = new Date();
    const disconnectedTins: string[] = [];
    
    setConnectedSensors((prev) => {
      const updated = new Map(prev);
      let hasChanges = false;
      
      prev.forEach((sensor, tin) => {
        const timeSinceLastData = now.getTime() - sensor.lastReceivedAt.getTime();
        if (timeSinceLastData > SENSOR_TIMEOUT_MS) {
          updated.delete(tin);
          disconnectedTins.push(tin);
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });
    
    if (disconnectedTins.length > 0) {
      setDevices((prev) =>
        prev.map((device) => {
          if (disconnectedTins.includes(device.tin)) {
            return { ...device, status: "offline" };
          }
          return device;
        })
      );
    }
  };

  // Start polling when topology tab is active and authenticated
  useEffect(() => {
    if (activeTab !== TABS.topology || showVideo || !isAuthenticated || authLoading) {
      return;
    }
    
    pollForData();
    pollIntervalRef.current = setInterval(pollForData, POLL_INTERVAL_MS);
    cleanupIntervalRef.current = setInterval(cleanupDisconnectedSensors, 1000);
    
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, showVideo, isAuthenticated, authLoading]);

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

  const skipVideo = () => setShowVideo(false);

  // Tab configuration for AppTabs component
  const tabs = Object.values(TABS);

  return (
    <div className="min-h-screen text-white relative" style={{ backgroundColor: colors.background }}>
      <Toaster position="top-right" richColors />

      <SensorsVideoIntro show={showVideo} onSkip={skipVideo} />

      {/* Main Content */}
      <div className={showVideo ? "opacity-0" : "opacity-100 transition-opacity duration-500"}>
        <SensorsHeader
          tabs={tabs}
          defaultTab={TABS.grid}
          onTabChange={(tab) => setActiveTab(tab as ActiveTab)}
          accentColor={colors.sensorAccent}
        />

        {/* Content Area */}
        <main className="px-8 py-6">
          <SensorsLoading loading={loading} />

          {/* Component Matrix Grid */}
          {!loading && activeTab === TABS.grid && (
            <SensorsGrid
              devices={devices}
              connectedSensors={connectedSensors}
              selectedDevice={selectedDevice}
              onSelectDevice={setSelectedDevice}
            />
          )}

          {/* Dynamic Live Topology */}
          {!loading && activeTab === TABS.topology && (
            <SensorsTopology
              connectedSensors={connectedSensors}
              getDeviceForSensor={getDeviceForSensor}
              onSelectDevice={setSelectedDevice}
              sensorTimeoutMs={SENSOR_TIMEOUT_MS}
              centralEndnode={centralEndnode}
              categoryConfig={categoryConfig}
            />
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

        {/* Selected Device Panel */}
        {selectedDevice && (activeTab === TABS.grid || activeTab === TABS.topology) && (
          <SensorsSelectedDevicePanel
            selectedDevice={selectedDevice}
            connectedSensors={connectedSensors}
            centralEndnode={centralEndnode}
            onClose={() => setSelectedDevice(null)}
          />
        )}
      </div>
    </div>
  );
}

export default Page;
