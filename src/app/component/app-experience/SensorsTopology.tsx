"use client";

import React from "react";
import { colors } from "@/config/theme";
import type { DisplayDevice, SensorLiveData } from "./types";

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

  // Count sensors that have fresh data
  const activeSensorCount = Array.from(connectedSensors.values()).filter(
    (s) => Date.now() - s.lastReceivedAt.getTime() < STALE_THRESHOLD_MS
  ).length;

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
    <div className="space-y-6">
      {/* Topology SVG */}
      <div className="relative w-full h-[500px] rounded-2xl overflow-hidden" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
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
            <image href="/assets/Logos/End Node.png" x={38} y={38} width={24} height={24} preserveAspectRatio="xMidYMid meet" />
          </g>
          <text x={50} y={62} textAnchor="middle" fill={colors.text} fontSize="2.5" fontWeight="bold">{centralEndnode.displayName}</text>
          <text x={50} y={65} textAnchor="middle" fill={colors.yellow} fontSize="2">{activeSensorCount} sensor{activeSensorCount !== 1 ? "s" : ""} active</text>

          {/* Sensor Nodes — only active sensors are visible */}
          {sensorPositions.map((sensorPos) => {
            const sensorData = connectedSensors.get(sensorPos.tin);
            const device = getDeviceForSensor(sensorPos.tin);
            const isActive = sensorData && Date.now() - sensorData.lastReceivedAt.getTime() < STALE_THRESHOLD_MS;
            if (!isActive || !sensorData) return null;

            return (
              <g
                key={sensorPos.tin}
                className="cursor-pointer"
                onClick={() => device && onSelectDevice(device)}
              >
                <circle cx={sensorPos.x} cy={sensorPos.y} r="3.5" fill={colors.backgroundCard} stroke={colors.primary} strokeWidth="0.4" />
                <circle cx={sensorPos.x} cy={sensorPos.y} r="1.5" fill={colors.primary} />
                <text x={sensorPos.x} y={sensorPos.y + 7} textAnchor="middle" fill={colors.yellow} fontSize="2" fontWeight="bold">
                  {sensorData.value.toFixed(1)}{sensorData.unit}
                </text>
                <text x={sensorPos.x} y={sensorPos.y + 9.5} textAnchor="middle" fill={colors.textMuted} fontSize="1.5">
                  {sensorData.displayName}
                </text>
              </g>
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
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
        <div className="p-4 border-b" style={{ borderColor: colors.border }}>
          <h3 className="text-lg font-bold" style={{ color: colors.text }}>Connected Sensors - Real-time Data</h3>
          <p className="text-sm" style={{ color: colors.textMuted }}>{activeSensorCount} sensor{activeSensorCount !== 1 ? "s" : ""} actively transmitting</p>
        </div>

        {activeSensorCount === 0 ? (
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
                {Array.from(connectedSensors.values())
                  .filter((s) => Date.now() - s.lastReceivedAt.getTime() < STALE_THRESHOLD_MS)
                  .map((sensor, idx) => {
                  const device = getDeviceForSensor(sensor.tin);
                  const history = sensor.history || [];
                  const trend = history.length > 1 ? history[history.length - 1] - history[0] : 0;
                  const timeSinceData = Math.floor((new Date().getTime() - sensor.lastReceivedAt.getTime()) / 1000);

                  return (
                    <tr key={sensor.tin} className="transition-colors duration-200 cursor-pointer hover:bg-white/5" style={{ backgroundColor: idx % 2 === 0 ? colors.transparent : `${colors.background}50`, borderBottom: `1px solid ${colors.border}` }} onClick={() => device && onSelectDevice(device)}>
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
  );
}

export default SensorsTopology;
