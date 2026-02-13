"use client";

import React, { useState, useEffect } from "react";
import { colors } from "@/config/theme";
import type { DisplayDevice, SensorLiveData } from "./types";
import AppSheet from "@/app/component/app-sheet/AppSheet";
import SensorsSelectedDevicePanel from "./SensorsSelectedDevicePanel";

const TILES_PER_PAGE = 16;

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
  const [currentPage, setCurrentPage] = useState(0);

  // Reset to page 0 when devices change
  useEffect(() => {
    setCurrentPage(0);
  }, [devices.length]);

  const totalPages = Math.max(1, Math.ceil(devices.length / TILES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageDevices = devices.slice(safePage * TILES_PER_PAGE, safePage * TILES_PER_PAGE + TILES_PER_PAGE);

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {pageDevices.map((device) => {
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
            style={{ color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >
            ← Previous
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: i === safePage ? colors.yellow : "transparent",
                  color: i === safePage ? colors.background : colors.textMuted,
                  border: i === safePage ? "none" : `1px solid ${colors.border}`,
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
            style={{ color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >
            Next →
          </button>
        </div>
      )}

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
