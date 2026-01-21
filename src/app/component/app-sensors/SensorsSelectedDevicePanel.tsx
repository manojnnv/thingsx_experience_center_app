"use client";

import React from "react";
import { colors } from "@/config/theme";
import type { DisplayDevice, SensorLiveData } from "./types";

function SensorsSelectedDevicePanel({
  selectedDevice,
  connectedSensors,
  centralEndnode,
  onClose,
}: {
  selectedDevice: DisplayDevice | null;
  connectedSensors: Map<string, SensorLiveData>;
  centralEndnode: { displayName: string };
  onClose: () => void;
}) {
  if (!selectedDevice) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: `${colors.background}80` }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 p-6 overflow-y-auto" style={{ backgroundColor: colors.backgroundCard, borderLeft: `1px solid ${colors.border}`, boxShadow: `-20px 0 60px ${colors.shadowDark}` }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg" style={{ backgroundColor: colors.background }}>
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
  );
}

export default SensorsSelectedDevicePanel;
