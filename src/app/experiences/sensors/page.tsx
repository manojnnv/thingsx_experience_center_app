"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
import { AppTabs, TabItem } from "@/components/AppTabs";

// Constants
const SENSOR_TIMEOUT_MS = 10000; // 10 seconds
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

// Types
type DisplayDevice = {
  tin: string;
  name: string;
  type: string;
  category: string;
  status: "online" | "offline";
  lastReading: number;
  unit: string;
};

type SensorLiveData = {
  tin: string;
  value: number;
  unit: string;
  displayName: string;
  category: string;
  lastReceivedAt: Date;
  history: number[];
};

type EPDFieldValues = {
  [tin: string]: {
    [fieldKey: string]: string | number;
  };
};

function Page() {
  // Auth state
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Page state
  const [showVideo, setShowVideo] = useState(true);
  const [activeTab, setActiveTab] = useState<"grid" | "topology" | "epd">("grid");
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
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState<string[]>([]);
  const [bulkFieldKey, setBulkFieldKey] = useState("");
  const [bulkFieldValue, setBulkFieldValue] = useState("");
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
    if (activeTab !== "topology" || showVideo || !isAuthenticated || authLoading) {
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

  const handleBulkUpdate = async () => {
    if (!bulkFieldKey || selectedForBulk.length === 0) return;
    
    setUpdating(true);
    try {
      const updates: BulkUpdatePayload[] = selectedForBulk.map((tin) => ({
        tin,
        [bulkFieldKey]: bulkFieldValue,
      }));
      await bulkUpdateEPD(updates);
      
      setEpdValues((prev) => {
        const newValues = { ...prev };
        selectedForBulk.forEach((tin) => {
          if (newValues[tin]) {
            newValues[tin][bulkFieldKey] = bulkFieldValue;
          }
        });
        return newValues;
      });
      
      setSelectedForBulk([]);
      setBulkFieldKey("");
      setBulkFieldValue("");
      setBulkMode(false);
    } finally {
      setUpdating(false);
    }
  };

  const toggleBulkSelect = (tin: string) => {
    setSelectedForBulk((prev) =>
      prev.includes(tin) ? prev.filter((t) => t !== tin) : [...prev, tin]
    );
  };

  // Calculate sensor positions
  const connectedSensorsList = Array.from(connectedSensors.values());
  const sensorPositions = connectedSensorsList.map((sensor, i) => {
    const angle = (i / Math.max(connectedSensorsList.length, 1)) * 2 * Math.PI - Math.PI / 2;
    return {
      tin: sensor.tin,
      x: 50 + 35 * Math.cos(angle),
      y: 50 + 35 * Math.sin(angle),
    };
  });

  const getDeviceForSensor = (tin: string) => devices.find((d) => d.tin === tin);

  const skipVideo = () => setShowVideo(false);

  // Tab configuration for AppTabs component
  const tabs: TabItem[] = [
    { id: "grid", label: "Component Matrix", icon: "📊" },
    { id: "topology", label: "Live Topology", icon: "🔗" },
    { id: "epd", label: "EPD Control", icon: "🖥️" },
  ];

  return (
    <div className="min-h-screen text-white relative" style={{ backgroundColor: colors.background }}>
      <Toaster position="top-right" richColors />

      {/* Video Intro Overlay */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: colors.background }}>
          <div className="relative w-full max-w-4xl mx-8">
            <div
              className="relative aspect-video rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: colors.backgroundCard, border: `2px solid ${colors.yellow}30` }}
            >
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colors.yellow}20` }}>
                  <svg viewBox="0 0 24 24" fill={colors.yellow} className="w-12 h-12">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: colors.yellow }}>Sensors & Endnodes</h2>
                <p style={{ color: colors.textMuted }}>Discover how IoT sensors revolutionize your operations</p>
              </div>
            </div>
            <button
              onClick={skipVideo}
              className="absolute bottom-6 right-6 px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2"
              style={{ backgroundColor: colors.yellow, color: colors.background }}
            >
              <span>Skip Intro</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={showVideo ? "opacity-0" : "opacity-100 transition-opacity duration-500"}>
        {/* Header */}
        <header className="sticky top-0 z-40 px-8 py-4" style={{ backgroundColor: `${colors.background}ee`, backdropFilter: "blur(10px)" }}>
          <div className="flex justify-between items-center">
            <Link href="/experiences" className="inline-flex items-center gap-2 text-sm transition-colors duration-300 group" style={{ color: colors.textMuted }}>
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="group-hover:text-white">Back</span>
            </Link>
            <h1 className="text-xl font-bold" style={{ color: colors.yellow }}>Sensors & Endnodes</h1>
            <div className="w-20" />
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mt-4">
            <AppTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(id) => setActiveTab(id as typeof activeTab)}
              accentColor={colors.sensorAccent}
            />
          </div>
        </header>

        {/* Content Area */}
        <main className="px-8 py-6">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${colors.yellow} transparent ${colors.yellow} ${colors.yellow}` }} />
                <p style={{ color: colors.textMuted }}>Loading devices...</p>
              </div>
            </div>
          )}

          {/* Component Matrix Grid */}
          {!loading && activeTab === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {devices.map((device) => {
                const liveData = connectedSensors.get(device.tin);
                return (
                  <button
                    key={device.tin}
                    onClick={() => setSelectedDevice(device)}
                    className="group relative p-4 rounded-xl transition-all duration-300 text-left"
                    style={{
                      backgroundColor: selectedDevice?.tin === device.tin ? `${colors.yellow}15` : colors.backgroundCard,
                      border: `1px solid ${selectedDevice?.tin === device.tin ? colors.yellow : colors.border}`,
                    }}
                  >
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full" style={{ backgroundColor: liveData ? colors.primary : colors.textFaint, boxShadow: liveData ? `0 0 8px ${colors.primary}` : "none" }} />
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${colors.yellow}15` }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={colors.yellow} strokeWidth={1.5} className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                    <p className="text-xs font-mono mb-1 truncate" style={{ color: colors.textMuted }}>{device.tin}</p>
                    <p className="text-sm font-medium truncate" style={{ color: colors.text }}>{device.type}</p>
                    <p className="text-lg font-bold mt-1" style={{ color: colors.yellow }}>
                      {liveData?.value.toFixed(1) || "--"} <span className="text-xs font-normal">{device.unit}</span>
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Dynamic Live Topology */}
          {!loading && activeTab === "topology" && (
            <div className="space-y-6">
              {/* Topology SVG */}
              <div className="relative w-full h-[500px] rounded-2xl overflow-hidden" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
                      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>

                  {/* Lines from Endnode to Sensors */}
                  {sensorPositions.map((sensor) => (
                    <line key={`line-${sensor.tin}`} x1={50} y1={50} x2={sensor.x} y2={sensor.y} stroke={colors.yellow} strokeWidth="0.4" opacity={0.5} />
                  ))}

                  {/* Central Endnode */}
                  <g>
                    <circle cx={50} cy={50} r="8" fill={colors.backgroundCard} stroke={colors.yellow} strokeWidth="1" filter="url(#glow)" />
                    <circle cx={50} cy={50} r="5" fill={`${colors.yellow}20`} />
                    <text x={50} y={51.5} textAnchor="middle" fill={colors.yellow} fontSize="3.5" fontWeight="bold">EN</text>
                  </g>
                  <text x={50} y={62} textAnchor="middle" fill={colors.text} fontSize="2.5" fontWeight="bold">{centralEndnode.displayName}</text>
                  <text x={50} y={65} textAnchor="middle" fill={colors.yellow} fontSize="2">{connectedSensorsList.length} sensors connected</text>

                  {/* Sensor Nodes */}
                  {sensorPositions.map((sensor) => {
                    const sensorData = connectedSensors.get(sensor.tin);
                    const device = getDeviceForSensor(sensor.tin);
                    if (!sensorData) return null;
                    return (
                      <g key={sensor.tin} className="cursor-pointer" onClick={() => device && setSelectedDevice(device)}>
                        <circle cx={sensor.x} cy={sensor.y} r="3.5" fill={colors.backgroundCard} stroke={colors.primary} strokeWidth="0.4" />
                        <circle cx={sensor.x} cy={sensor.y} r="1.5" fill={colors.primary} />
                        <text x={sensor.x} y={sensor.y + 7} textAnchor="middle" fill={colors.yellow} fontSize="2" fontWeight="bold">{sensorData.value.toFixed(1)}{sensorData.unit}</text>
                        <text x={sensor.x} y={sensor.y + 9.5} textAnchor="middle" fill={colors.textMuted} fontSize="1.5">{sensorData.displayName}</text>
                      </g>
                    );
                  })}

                  {connectedSensorsList.length === 0 && (
                    <text x={50} y={75} textAnchor="middle" fill={colors.textMuted} fontSize="2.5">Waiting for sensor data...</text>
                  )}
                </svg>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 p-3 rounded-lg" style={{ backgroundColor: `${colors.background}ee` }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: colors.yellow }}>Dynamic Topology</p>
                  <div className="flex flex-col gap-2 text-xs" style={{ color: colors.textMuted }}>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2" style={{ borderColor: colors.yellow, backgroundColor: colors.backgroundCard }} /> Endnode</span>
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} /> Connected sensor</span>
                    <span className="flex items-center gap-2 text-[10px]" style={{ color: colors.textFaint }}>Timeout: {SENSOR_TIMEOUT_MS / 1000}s</span>
                  </div>
                </div>
                <div className="absolute top-4 right-4 text-xs" style={{ color: colors.textMuted }}>Click a sensor to view details</div>
              </div>

              {/* Real-time Data Table */}
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
                <div className="p-4 border-b" style={{ borderColor: colors.border }}>
                  <h3 className="text-lg font-bold" style={{ color: colors.text }}>Connected Sensors - Real-time Data</h3>
                  <p className="text-sm" style={{ color: colors.textMuted }}>{connectedSensorsList.length} sensor{connectedSensorsList.length !== 1 ? "s" : ""} actively transmitting</p>
                </div>
                
                {connectedSensorsList.length === 0 ? (
                  <div className="p-8 text-center" style={{ color: colors.textMuted }}>
                    <p>No sensors are currently transmitting data.</p>
                    <p className="text-sm mt-2">Sensors will appear here when they send data.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ backgroundColor: colors.background }}>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Sensor</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Last Data</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Current Value</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Trend (30s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {connectedSensorsList.map((sensor, idx) => {
                          const device = getDeviceForSensor(sensor.tin);
                          const history = sensor.history || [];
                          const trend = history.length > 1 ? history[history.length - 1] - history[0] : 0;
                          const timeSinceData = Math.floor((new Date().getTime() - sensor.lastReceivedAt.getTime()) / 1000);
                          
                          return (
                            <tr key={sensor.tin} className="transition-colors duration-200 cursor-pointer hover:bg-white/5" style={{ backgroundColor: idx % 2 === 0 ? colors.transparent : `${colors.background}50`, borderBottom: `1px solid ${colors.border}` }} onClick={() => device && setSelectedDevice(device)}>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium" style={{ color: colors.text }}>{sensor.displayName}</p>
                                  <p className="text-xs font-mono" style={{ color: colors.textMuted }}>{sensor.tin}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3"><span className="text-sm" style={{ color: colors.text }}>{categoryConfig[sensor.category]?.label || sensor.category}</span></td>
                              <td className="px-4 py-3"><span className="text-sm" style={{ color: timeSinceData > 5 ? colors.textMuted : colors.primary }}>{timeSinceData}s ago</span></td>
                              <td className="px-4 py-3">
                                <span className="text-lg font-bold" style={{ color: colors.yellow }}>
                                  {sensor.value.toFixed(1)}<span className="text-xs font-normal ml-1" style={{ color: colors.textMuted }}>{sensor.unit}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-20 flex items-end gap-px">
                                    {history.slice(-15).map((val, i) => {
                                      const min = Math.min(...history);
                                      const max = Math.max(...history);
                                      const range = max - min || 1;
                                      const height = ((val - min) / range) * 100;
                                      return <div key={i} className="flex-1 rounded-t" style={{ height: `${Math.max(10, height)}%`, backgroundColor: colors.yellow, opacity: 0.3 + (i / 15) * 0.7 }} />;
                                    })}
                                  </div>
                                  <span className="text-xs font-medium flex items-center" style={{ color: trend > 0 ? colors.primary : trend < 0 ? "#ff6b6b" : colors.textMuted }}>
                                    {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"}{Math.abs(trend).toFixed(1)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EPD Control */}
          {!loading && activeTab === "epd" && (
            <div className="space-y-6">
              {/* Bulk Mode Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
                <div>
                  <h3 className="font-semibold" style={{ color: colors.text }}>Bulk Update Mode</h3>
                  <p className="text-sm" style={{ color: colors.textMuted }}>Select multiple EPDs to update at once</p>
                </div>
                <button onClick={() => { setBulkMode(!bulkMode); setSelectedForBulk([]); }} className="px-4 py-2 rounded-lg font-medium transition-all duration-300" style={{ backgroundColor: bulkMode ? colors.yellow : colors.transparent, color: bulkMode ? colors.background : colors.yellow, border: `1px solid ${colors.yellow}` }}>
                  {bulkMode ? "Exit Bulk Mode" : "Enable Bulk Mode"}
                </button>
              </div>

              {/* Bulk Update Controls */}
              {bulkMode && selectedForBulk.length > 0 && (
                <div className="p-4 rounded-xl space-y-4" style={{ backgroundColor: `${colors.yellow}10`, border: `1px solid ${colors.yellow}30` }}>
                  <p className="text-sm font-medium" style={{ color: colors.yellow }}>{selectedForBulk.length} EPD(s) selected</p>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-xs mb-1" style={{ color: colors.textMuted }}>Field to Update</label>
                      <select value={bulkFieldKey} onChange={(e) => setBulkFieldKey(e.target.value)} className="w-full px-3 py-2 rounded-lg outline-none" style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, color: colors.text }}>
                        <option value="">Select field...</option>
                        {sensorEPDDevices[0]?.fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs mb-1" style={{ color: colors.textMuted }}>New Value</label>
                      <input type="text" value={bulkFieldValue} onChange={(e) => setBulkFieldValue(e.target.value)} placeholder="Enter value..." className="w-full px-3 py-2 rounded-lg outline-none" style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, color: colors.text }} />
                    </div>
                    <button onClick={handleBulkUpdate} disabled={updating || !bulkFieldKey} className="px-6 py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50" style={{ backgroundColor: colors.yellow, color: colors.background }}>
                      {updating ? "Updating..." : "Apply to All"}
                    </button>
                  </div>
                </div>
              )}

              {/* EPD Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sensorEPDDevices.map((epd) => {
                  const colorScheme = epdColorMap[epd.color];
                  const isSelected = selectedForBulk.includes(epd.tin);
                  
                  return (
                    <div key={epd.tin} className="rounded-xl overflow-hidden transition-all duration-300" style={{ border: `2px solid ${isSelected ? colors.yellow : colors.border}`, boxShadow: isSelected ? `0 0 20px ${colors.yellow}30` : "none" }}>
                      {/* Header */}
                      <div className="p-3 flex items-center justify-between" style={{ backgroundColor: colors.backgroundCard }}>
                        <div className="flex items-center gap-2">
                          {bulkMode && (
                            <button onClick={() => toggleBulkSelect(epd.tin)} className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors" style={{ borderColor: isSelected ? colors.yellow : colors.textMuted, backgroundColor: isSelected ? colors.yellow : colors.transparent }}>
                              {isSelected && <svg className="w-3 h-3" fill={colors.background} viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            </button>
                          )}
                          <div>
                            <p className="text-xs font-mono" style={{ color: colors.textMuted }}>{epd.tin}</p>
                            <p className="text-sm font-medium" style={{ color: colors.text }}>{epd.displayName}</p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${colorScheme.accent}30`, color: colorScheme.text }}>{epd.size} • {epd.color}</span>
                      </div>

                      {/* Preview */}
                      <div className="p-4 flex items-center justify-center" style={{ backgroundColor: colorScheme.bg, minHeight: epd.size === "large" ? "180px" : epd.size === "medium" ? "120px" : "100px" }}>
                        <div className="text-center">
                          {epd.fields.slice(0, 3).map((field) => (
                            <p key={field.key} className={field.key === "title" || field.key === "header" ? "text-lg font-bold" : "text-sm"} style={{ color: colorScheme.text }}>
                              {epdValues[epd.tin]?.[field.key] || field.defaultValue || "--"}
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Edit Fields */}
                      <div className="p-4 space-y-3" style={{ backgroundColor: colors.backgroundCard }}>
                        {epd.fields.map((field) => (
                          <div key={field.key}>
                            <label className="block text-xs mb-1" style={{ color: colors.textMuted }}>{field.label}</label>
                            <input type={field.type === "number" || field.type === "price" ? "number" : "text"} value={epdValues[epd.tin]?.[field.key] ?? ""} onChange={(e) => handleEPDFieldChange(epd.tin, field.key, e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2" style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, color: colors.text }} />
                          </div>
                        ))}
                        <button onClick={() => handleUpdateSingleEPD(epd)} disabled={updating} className="w-full py-2 rounded-lg font-semibold text-sm transition-all duration-300 disabled:opacity-50" style={{ backgroundColor: colors.yellow, color: colors.background }}>
                          {updating ? "Updating..." : "Update EPD"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* Selected Device Panel */}
        {selectedDevice && (activeTab === "grid" || activeTab === "topology") && (
          <>
            <div className="fixed inset-0 z-40" style={{ backgroundColor: `${colors.background}80` }} onClick={() => setSelectedDevice(null)} />
            <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 p-6 overflow-y-auto" style={{ backgroundColor: colors.backgroundCard, borderLeft: `1px solid ${colors.border}`, boxShadow: `-20px 0 60px ${colors.shadowDark}` }}>
              <button onClick={() => setSelectedDevice(null)} className="absolute top-4 right-4 p-2 rounded-lg" style={{ backgroundColor: colors.background }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={colors.textMuted} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="mt-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${colors.yellow}20` }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={colors.yellow} strokeWidth={1.5} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546" /></svg>
                  </div>
                  <div>
                    <p className="text-xs font-mono" style={{ color: colors.textMuted }}>{selectedDevice.tin}</p>
                    <h3 className="text-xl font-bold" style={{ color: colors.text }}>{selectedDevice.name}</h3>
                    {(() => {
                      const sensorData = connectedSensors.get(selectedDevice.tin);
                      return (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full mt-1" style={{ backgroundColor: sensorData ? `${colors.primary}20` : `${colors.textFaint}20`, color: sensorData ? colors.primary : colors.textFaint }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sensorData ? colors.primary : colors.textFaint }} />
                          {sensorData ? "Connected" : "Disconnected"}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
                  <p className="text-sm mb-1" style={{ color: colors.textMuted }}>Connected To</p>
                  <p className="text-base font-semibold" style={{ color: colors.yellow }}>{centralEndnode.displayName}</p>
                </div>
                
                {(() => {
                  const sensorData = connectedSensors.get(selectedDevice.tin);
                  return (
                    <>
                      <div className="p-6 rounded-xl mb-6" style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
                        <p className="text-sm mb-2" style={{ color: colors.textMuted }}>Current Reading</p>
                        <p className="text-5xl font-bold" style={{ color: colors.yellow }}>
                          {sensorData?.value.toFixed(1) || "--"}
                          <span className="text-lg font-normal ml-1" style={{ color: colors.textMuted }}>{selectedDevice.unit}</span>
                        </p>
                        {sensorData && <p className="text-xs mt-2" style={{ color: colors.textMuted }}>Last data: {Math.floor((new Date().getTime() - sensorData.lastReceivedAt.getTime()) / 1000)}s ago</p>}
                      </div>
                      <div className="p-4 rounded-xl" style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
                        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>Live Data Stream (30s)</p>
                        <div className="h-32 flex items-end gap-1">
                          {sensorData?.history.length ? (
                            sensorData.history.map((value, i, arr) => {
                              const min = Math.min(...arr);
                              const max = Math.max(...arr);
                              const range = max - min || 1;
                              const height = ((value - min) / range) * 100;
                              return <div key={i} className="flex-1 rounded-t transition-all duration-300" style={{ height: `${Math.max(10, height)}%`, backgroundColor: colors.yellow, opacity: 0.3 + (i / arr.length) * 0.7 }} />;
                            })
                          ) : (
                            <p className="w-full text-center text-sm" style={{ color: colors.textFaint }}>No data available</p>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Page;
