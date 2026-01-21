"use client";

import React from "react";
import { colors } from "@/config/theme";
import type { EPDConfig } from "@/config/devices";
import type { EPDFieldValues } from "./types";

function SensorsEpdControl({
  sensorEPDDevices,
  epdColorMap,
  epdValues,
  updating,
  onEPDFieldChange,
  onUpdateSingleEPD,
}: {
  sensorEPDDevices: EPDConfig[];
  epdColorMap: Record<string, { bg: string; text: string; accent: string }>;
  epdValues: EPDFieldValues;
  updating: boolean;
  onEPDFieldChange: (tin: string, fieldKey: string, value: string | number) => void;
  onUpdateSingleEPD: (epd: EPDConfig) => void;
}) {
  return (
    <div className="space-y-6">
      {/* EPD Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sensorEPDDevices.map((epd) => {
          const colorScheme = epdColorMap[epd.color];
          
          return (
            <div key={epd.tin} className="rounded-xl overflow-hidden transition-all duration-300" style={{ border: `1px solid ${colors.border}` }}>
              {/* Header */}
              <div className="p-3 flex items-center justify-between" style={{ backgroundColor: colors.backgroundCard }}>
                <div>
                  <p className="text-xs font-mono" style={{ color: colors.textMuted }}>{epd.tin}</p>
                  <p className="text-sm font-medium" style={{ color: colors.text }}>{epd.displayName}</p>
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
                    <input type={field.type === "number" || field.type === "price" ? "number" : "text"} value={epdValues[epd.tin]?.[field.key] ?? ""} onChange={(e) => onEPDFieldChange(epd.tin, field.key, e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2" style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, color: colors.text }} />
                  </div>
                ))}
                <button onClick={() => onUpdateSingleEPD(epd)} disabled={updating} className="w-full py-2 rounded-lg font-semibold text-sm transition-all duration-300 disabled:opacity-50" style={{ backgroundColor: colors.yellow, color: colors.background }}>
                  {updating ? "Updating..." : "Update EPD"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SensorsEpdControl;
