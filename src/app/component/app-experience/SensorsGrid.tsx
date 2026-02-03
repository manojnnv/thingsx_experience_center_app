"use client";

import React from "react";
import { colors } from "@/config/theme";
import type { DisplayDevice, SensorLiveData } from "./types";
import AppSheet from "@/app/component/app-sheet/AppSheet";
import SensorsSelectedDevicePanel from "./SensorsSelectedDevicePanel";

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {devices.map((device) => {
          const liveData = connectedSensors.get(device.tin);
          const colorDisplay = liveData?.valueDisplay ?? device.lastReadingDisplay;
          const isColorTile = (device.category === "led" || device.category === "addressable_rgb") && colorDisplay && /^#([0-9A-Fa-f]{3}){1,2}$/.test(colorDisplay);
          const displayValue = liveData?.value ?? device.lastReading;
          const displayUnit = liveData?.unit ?? device.unit;
          const latestData =
            displayValue !== null && displayValue !== undefined
              ? `${displayValue.toFixed(1)} ${displayUnit}`.trim()
              : "--";
          return (
            <button
              key={device.tin}
              onClick={() => onSelectDevice(device)}
              className="group relative p-4 rounded-xl transition-all duration-300 text-left flex flex-col min-h-[120px]"
              style={{
                backgroundColor: selectedDevice?.tin === device.tin ? `${colors.yellow}15` : colors.backgroundCard,
                border: `1px solid ${selectedDevice?.tin === device.tin ? colors.yellow : colors.border}`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              {/* Row 1: icon (top-left) + latest data (large value) */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: `${colors.yellow}15` }}
                >
                  {device.icon && (device.icon.startsWith("http") || device.icon.startsWith("/")) ? (
                    <div
                      className="w-8 h-8 shrink-0"
                      style={{
                        backgroundColor: colors.yellow,
                        maskImage: `url(${device.icon})`,
                        maskSize: "contain",
                        maskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskImage: `url(${device.icon})`,
                        WebkitMaskSize: "contain",
                        WebkitMaskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                      }}
                      role="img"
                      aria-label=""
                    />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke={colors.yellow} strokeWidth={1.5} className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  )}
                </div>
                {isColorTile ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-8 h-8 rounded-lg shrink-0 border border-white/20"
                      style={{ backgroundColor: colorDisplay }}
                      title={colorDisplay}
                    />
                    <span className="text-lg font-bold truncate" style={{ color: colors.yellow }}>
                      {colorDisplay}
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold tabular-nums truncate" style={{ color: colors.yellow }}>
                    {latestData}
                  </span>
                )}
              </div>
              {/* Row 2: device type name */}
              <p className="text-sm font-medium truncate mt-auto" style={{ color: colors.text }}>
                {device.type}
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
