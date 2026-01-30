"use client";

import React from "react";
import { colors } from "@/config/theme";
import type { DisplayDevice, SensorLiveData } from "./types";
import AppSheet from "@/app/component/app-sheet/AppSheet";
import SensorsSelectedDevicePanel from "./SensorsSelectedDevicePanel";
import { formatDateTime } from "@/app/utils/dateTime";

function SensorsGrid({
  devices,
  connectedSensors,
  selectedDevice,
  onSelectDevice,
  onClose,
  centralEndnode,
}: {
  devices: DisplayDevice[];
  connectedSensors: Map<string, SensorLiveData>;
  selectedDevice: DisplayDevice | null;
  onSelectDevice: (device: DisplayDevice) => void;
  onClose: () => void;
  centralEndnode: { displayName: string };
}) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {devices.map((device) => {
          const liveData = connectedSensors.get(device.tin);
          const displayValue = liveData?.value ?? device.lastReading;
          const displayUnit = liveData?.unit ?? device.unit;
          const lastAt = liveData?.lastReceivedAt ?? device.lastReceivedAt ?? null;
          const lastLabel = lastAt ? formatDateTime(lastAt.toISOString()) : null;
          return (
            <button
              key={device.tin}
              onClick={() => onSelectDevice(device)}
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
              <p className="text-sm font-medium truncate" style={{ color: colors.text }}>{device.name}</p>
              <p className="text-xs truncate" style={{ color: colors.textMuted }}>{device.type}</p>
              <p className="text-lg font-bold mt-1" style={{ color: colors.yellow }}>
                {displayValue !== null && displayValue !== undefined ? displayValue.toFixed(1) : "--"}{" "}
                <span className="text-xs font-normal">{displayUnit}</span>
              </p>
              <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {lastLabel ? `Last received ${lastLabel}` : "No recent data"}
              </p>
            </button>
          );
        })}
      </div>
      <AppSheet
        open={Boolean(selectedDevice)}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
        title="Sensor Details"
        id={selectedDevice?.tin}
        accentColor={colors.yellow}
      >
        <SensorsSelectedDevicePanel
          selectedDevice={selectedDevice}
          connectedSensors={connectedSensors}
          centralEndnode={centralEndnode}
          onClose={onClose}
        />
      </AppSheet>
    </>
  );
}

export default SensorsGrid;
