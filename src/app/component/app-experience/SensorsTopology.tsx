"use client";

import React from "react";
import { colors } from "@/config/theme";
import { sanitizeSensorValue } from "@/app/services/sensors/sensors";
import type { DisplayDevice, SensorLiveData } from "./types";

interface MemoizedSensorNodeProps {
  sensorPos: { tin: string; x: number; y: number };
  sensorData: SensorLiveData;
  device?: DisplayDevice;
  onSelectDevice: (device: DisplayDevice) => void;
  displayOpts: { category?: string };
}

const MemoizedSensorNode = React.memo(
  ({ sensorPos, sensorData, device, onSelectDevice, displayOpts }: MemoizedSensorNodeProps) => {
    const r = 5.5; // sensor circle radius
    const iconSize = 7; // logo size inside circle

    const fields = sensorData.fields;
    const fieldKeys = fields ? Object.keys(fields) : [];
    const hasMultipleFields = fieldKeys.length > 1;
    const history = sensorData.history || [];
    const lastKnownGood = history.length > 0 ? history[history.length - 1] : null;
    const displayValue = sensorData.value !== null ? sensorData.value : lastKnownGood;
    const allFieldsTooltip =
      fieldKeys.length > 0
        ? Object.entries(fields!)
            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v?.value != null ? sanitizeSensorValue(Number(v.value) || 0, { ...displayOpts, metric: k }).toFixed(1) : "—"}`)
            .join("\n")
        : displayValue != null ? `${displayValue.toFixed(1)} ${sensorData.unit}` : "—";

    return (
      <g
        className="cursor-pointer"
        onClick={() => device && onSelectDevice(device)}
      >
        <title>{sensorData.displayName}{"\n"}{allFieldsTooltip}</title>
        <circle cx={sensorPos.x} cy={sensorPos.y} r={r} fill={colors.backgroundCard} stroke={colors.primary} strokeWidth="0.4" />
        {device?.icon ? (
          <image
            href={device.icon}
            x={sensorPos.x - iconSize / 2}
            y={sensorPos.y - iconSize / 2}
            width={iconSize}
            height={iconSize}
            preserveAspectRatio="xMidYMid meet"
            filter="url(#greenTint)"
          />
        ) : (
          <circle cx={sensorPos.x} cy={sensorPos.y} r="2" fill={colors.primary} />
        )}
        {hasMultipleFields && fieldKeys.length > 0 ? (
          <>
            <text x={sensorPos.x} y={sensorPos.y + r + 4.5} textAnchor="middle" fill={colors.textMuted} fontSize="2.6">
              {sensorData.displayName}
            </text>
            {fieldKeys.map((k, i) => {
              const v = fields![k]?.value;
              const safe = v != null ? sanitizeSensorValue(Number(v) || 0, { ...displayOpts, metric: k }) : null;
              const label = k.replace(/_/g, " ");
              const y = sensorPos.y + r + 7.8 + i * 3.4;
              return (
                <text key={k} x={sensorPos.x} y={y} textAnchor="middle" fill={colors.yellow} fontSize="3.2">
                  {label}: {safe != null ? safe.toFixed(1) : "—"}
                </text>
              );
            })}
          </>
        ) : (
          <>
            <text x={sensorPos.x} y={sensorPos.y + r + 4.5} textAnchor="middle" fill={colors.textMuted} fontSize="2.6">
              {sensorData.displayName}
            </text>
            <text x={sensorPos.x} y={sensorPos.y + r + 7.5} textAnchor="middle" fill={colors.yellow} fontSize="3.2">
              {displayValue != null ? `${displayValue.toFixed(1)}${sensorData.unit}` : "—"}
            </text>
          </>
        )}
      </g>
    );
  },
  (prev, next) => {
    return prev.sensorData.lastReceivedAt.getTime() === next.sensorData.lastReceivedAt.getTime() &&
           prev.device?.icon === next.device?.icon;
  }
);

// Row implementation moved directly into component to keep code simple, readable and easy to debug.

function SensorsTopology({
  devices,
  connectedSensors,
  getDeviceForSensor,
  onSelectDevice,
  centralEndnode,
  categoryConfig,
}: {
  devices: DisplayDevice[];
  connectedSensors: Map<string, SensorLiveData>;
  getDeviceForSensor: (tin: string) => DisplayDevice | undefined;
  onSelectDevice: (device: DisplayDevice) => void;
  centralEndnode: { displayName: string };
  categoryConfig: Record<string, { label?: string }>;
}) {
  const STALE_THRESHOLD_MS = 15000; // 15s — sensor is "stale" if no fresh data
  const HIDDEN_CATEGORIES = new Set(["load_cell", "addressable_rgb"]);

  // Tick every second to ensure "timeSinceData" updates even when exactly no new sensor values arrive.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const isVisibleSensor = (s: SensorLiveData) => {
    if (Date.now() - s.lastReceivedAt.getTime() >= STALE_THRESHOLD_MS) return false;
    const d = getDeviceForSensor(s.tin);
    return !d || !HIDDEN_CATEGORIES.has(d.category);
  };

  // Count sensors that have fresh data (excluding hidden categories)
  const activeSensorCount = Array.from(connectedSensors.values()).filter(isVisibleSensor).length;

  // Fixed positions for EVERY configured device — layout never shifts
  const sensorPositions = devices.map((device, i) => {
    const angle = (i / Math.max(devices.length, 1)) * 2 * Math.PI - Math.PI / 2;
    return {
      tin: device.tin,
      x: 50 + 35 * Math.cos(angle),
      y: 50 + 35 * Math.sin(angle),
    };
  });

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      {/* Topology SVG */}
      <div className="relative w-full flex-[3] min-h-0 rounded-2xl overflow-hidden" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="greenTint">
              <feColorMatrix type="matrix" values="0 0 0 0 0.13  0 0 0 0 0.84  0 0 0 0 0.38  0 0 0 1 0" />
            </filter>
          </defs>

          {/* Lines from Endnode to active sensors only */}
          {sensorPositions.map((sensorPos) => {
            const sensorData = connectedSensors.get(sensorPos.tin);
            const isActive = sensorData && Date.now() - sensorData.lastReceivedAt.getTime() < STALE_THRESHOLD_MS;
            if (!isActive) return null;

            return (
              <line
                key={`line-${sensorPos.tin}`}
                x1={50} y1={50}
                x2={sensorPos.x} y2={sensorPos.y}
                stroke={colors.yellow}
                strokeWidth="0.4"
                opacity={0.5}
              />
            );
          })}

          {/* Central Endnode */}
          <g>
            <circle cx={50} cy={50} r="10" fill={colors.backgroundCard} stroke={colors.yellow} strokeWidth="1" filter="url(#glow)" />
            <image href="/assets/Logos/End Node.png" x={43} y={43} width={14} height={14} preserveAspectRatio="xMidYMid meet" filter="url(#greenTint)" />
          </g>
          <text x={50} y={63} textAnchor="middle" fill={colors.text} fontSize="3.5" fontWeight="bold">{centralEndnode.displayName}</text>
          <text x={50} y={67} textAnchor="middle" fill={colors.yellow} fontSize="2.8">{activeSensorCount} sensor{activeSensorCount !== 1 ? "s" : ""} active</text>

          {/* Sensor Nodes — only active sensors are visible, with logos */}
          {sensorPositions.map((sensorPos) => {
            const sensorData = connectedSensors.get(sensorPos.tin);
            const device = getDeviceForSensor(sensorPos.tin);
            const isActive = sensorData && Date.now() - sensorData.lastReceivedAt.getTime() < STALE_THRESHOLD_MS;
            if (!isActive || !sensorData) return null;

            const displayOpts = { category: device?.category };

            return (
              <MemoizedSensorNode
                key={sensorPos.tin}
                sensorPos={sensorPos}
                sensorData={sensorData}
                device={device}
                onSelectDevice={onSelectDevice}
                displayOpts={displayOpts}
              />
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 p-3 rounded-lg" style={{ backgroundColor: `${colors.background}ee` }}>
          <p className="text-xs font-semibold mb-2" style={{ color: colors.yellow }}>Live Topology</p>
          <div className="flex flex-col gap-2 text-xs" style={{ color: colors.textMuted }}>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2" style={{ borderColor: colors.yellow, backgroundColor: colors.backgroundCard }} /> Endnode</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} /> Active sensor</span>
          </div>
        </div>
        <div className="absolute top-4 right-4 text-xs" style={{ color: colors.textMuted }}>Click a sensor to view details</div>
      </div>

      {/* Real-time Data Table */}
      <div className="rounded-2xl overflow-hidden flex-[2] min-h-0 flex flex-col" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
        <div className="p-3 border-b flex-none" style={{ borderColor: colors.border }}>
          <h3 className="text-sm font-bold" style={{ color: colors.text }}>Connected Sensors - Real-time Data</h3>
          <p className="text-xs" style={{ color: colors.textMuted }}>{activeSensorCount} sensor{activeSensorCount !== 1 ? "s" : ""} actively transmitting</p>
        </div>

        {activeSensorCount === 0 ? (
          <div className="p-4 text-center flex-1" style={{ color: colors.textMuted }}>
            <p>No sensors are currently transmitting data.</p>
            <p className="text-xs mt-1">Sensors will appear here when they send data.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-left" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr style={{ backgroundColor: colors.background }}>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider w-1/4" style={{ color: colors.textMuted }}>Sensor</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider w-1/6" style={{ color: colors.textMuted }}>Type</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider w-1/6" style={{ color: colors.textMuted }}>Last Data</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider w-1/4" style={{ color: colors.textMuted }}>Current Value</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider w-1/6" style={{ color: colors.textMuted }}>Trend (30s)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(connectedSensors.values())
                  .filter(isVisibleSensor)
                  .map((sensor, idx) => {
                    const device = getDeviceForSensor(sensor.tin);
                    const history = sensor.history || [];
                    const tableOpts = { category: sensor.category };
                    const lastKnownGood = history.length > 0 ? history[history.length - 1] : null;
                    const displayCurrent = sensor.value !== null ? sensor.value : lastKnownGood;
                    
                    // Fix negative "Last Data" time server-client drift
                    const timeSinceData = Math.max(0, Math.floor((new Date().getTime() - sensor.lastReceivedAt.getTime()) / 1000));

                    // Fix trend inconsistencies: align numerical trend perfectly with visible 15-frame sparkline
                    const recentHistory = history.slice(-15);
                    const trend = recentHistory.length > 1 ? recentHistory[recentHistory.length - 1] - recentHistory[0] : 0;
                    
                    // Always render exactly 15 bars in the sparkline to avoid column jumps
                    const paddedHistory = [...Array(Math.max(0, 15 - recentHistory.length)).fill(null), ...recentHistory];
                    
                    // Keep code clean by extracting secondary fields map inline locally
                    const secondaryFields = sensor.fields 
                      ? Object.entries(sensor.fields)
                          .slice(1)
                          .map(([k, v]) => {
                            const safeVal = v?.value != null ? sanitizeSensorValue(Number(v.value) || 0, { ...tableOpts, metric: k }) : null;
                            return `${k.replace(/_/g, " ")}: ${safeVal !== null ? safeVal.toFixed(1) : "—"}`;
                          })
                          .join(" | ")
                      : null;

                    return (
                      <tr key={sensor.tin} className="transition-colors duration-200 cursor-pointer hover:bg-white/5" style={{ backgroundColor: idx % 2 === 0 ? colors.transparent : `${colors.background}50`, borderBottom: `1px solid ${colors.border}` }} onClick={() => device && onSelectDevice(device)}>
                        <td className="px-3 py-2 w-1/4">
                          <div>
                            <p className="text-sm font-medium" style={{ color: colors.text }}>{sensor.displayName}</p>
                            <p className="text-xs font-mono" style={{ color: colors.textMuted }}>{sensor.tin}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2 w-1/6"><span className="text-sm" style={{ color: colors.text }}>{categoryConfig[sensor.category]?.label || sensor.category}</span></td>
                        <td className="px-3 py-2 w-1/6"><span className="text-sm font-medium" style={{ color: timeSinceData > 5 ? colors.textMuted : colors.primary }}>{timeSinceData}s ago</span></td>
                        <td className="px-3 py-2 w-1/4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-base font-bold" style={{ color: colors.yellow }}>
                              {displayCurrent != null ? displayCurrent.toFixed(1) : "—"}<span className="text-xs font-normal ml-1" style={{ color: colors.textMuted }}>{sensor.unit}</span>
                            </span>
                            {secondaryFields && (
                              <p className="text-xs font-medium" style={{ color: colors.textMuted }}>
                                {secondaryFields}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 w-1/6">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-20 flex items-end gap-px">
                              {paddedHistory.map((val, i) => {
                                if (val === null) return <div key={i} className="flex-1 rounded-t" style={{ height: "10%", backgroundColor: colors.yellow, opacity: 0.1 }} />;
                                const min = Math.min(...recentHistory);
                                const max = Math.max(...recentHistory);
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
  );
}

export default SensorsTopology;
