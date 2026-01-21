"use client";

import React from "react";
import { colors } from "@/config/theme";
import RetailCustomDropdown from "./RetailCustomDropdown";
import type { DropdownOption } from "./types";
import type { DeviceCategory, DeviceConfigOption, BulkDeviceData, EslTemplate } from "@/app/services/bulkUpload/bulkUpload";

function RetailEpdTab({
  accent,
  deviceCategories,
  deviceConfigOptions,
  eslTemplates,
  selectedCategory,
  selectedConfig,
  selectedTemplateId,
  onCategoryChange,
  onConfigChange,
  onTemplateChange,
  onLoadBulkDevices,
  bulkDevices,
  bulkColumns,
  bulkLoading,
  templateDevicePrefixes,
  nestedObjectType,
  hasUploadedCsv,
  onDownloadCsv,
  onUploadCsv,
  onPushAllUpdates,
  fileInputRef,
}: {
  accent: string;
  deviceCategories: DeviceCategory[];
  deviceConfigOptions: DeviceConfigOption[];
  eslTemplates: EslTemplate[];
  selectedCategory: string;
  selectedConfig: string;
  selectedTemplateId: string;
  onCategoryChange: (value: string) => void;
  onConfigChange: (value: string) => void;
  onTemplateChange: (value: string) => void;
  onLoadBulkDevices: () => void;
  bulkDevices: BulkDeviceData[];
  bulkColumns: string[];
  bulkLoading: boolean;
  templateDevicePrefixes: string[];
  nestedObjectType: string;
  hasUploadedCsv: boolean;
  onDownloadCsv: () => void;
  onUploadCsv: (file: File) => void;
  onPushAllUpdates: () => void;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
}) {
  const categoryOptions: DropdownOption[] = deviceCategories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  const configOptions: DropdownOption[] = deviceConfigOptions.map((opt) => ({
    value: opt.id,
    label: opt.name,
  }));

  const templateOptions: DropdownOption[] = eslTemplates.map((template) => ({
    value: template.id,
    label: template.name || `Template ${template.id}`,
  }));

  const requiresTemplate = templateDevicePrefixes.some((prefix) => selectedCategory.startsWith(prefix));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-xl font-bold" style={{ color: colors.text }}>Bulk Updates</h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              Select device category and configuration
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <RetailCustomDropdown
              label="Device Category"
              value={selectedCategory}
              options={categoryOptions}
              onChange={onCategoryChange}
              placeholder="Choose category..."
              accent={accent}
            />

            <RetailCustomDropdown
              label="Device Config"
              value={selectedConfig}
              options={configOptions}
              onChange={onConfigChange}
              placeholder="Choose config..."
              disabled={!selectedCategory}
              accent={accent}
            />

            {requiresTemplate && (
              <RetailCustomDropdown
                label="Template"
                value={selectedTemplateId}
                options={templateOptions}
                onChange={onTemplateChange}
                placeholder="Choose template..."
                disabled={!selectedCategory}
                accent={accent}
              />
            )}

            <button
              onClick={onLoadBulkDevices}
              disabled={!selectedCategory || !selectedConfig || bulkLoading || (requiresTemplate && !selectedTemplateId)}
              className="px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              style={{ backgroundColor: accent, color: colors.background }}
            >
              {bulkLoading ? (
                <>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `${colors.background} transparent transparent` }} />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Submit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {bulkDevices.length > 0 && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
          <div className="flex items-center justify-end mb-6 flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onUploadCsv(file);
                  event.target.value = "";
                }
              }}
            />
            {bulkDevices.length > 0 && (
              <button
                onClick={onDownloadCsv}
                className="px-4 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                style={{ backgroundColor: `${accent}15`, color: accent, border: `1px solid ${accent}40` }}
              >
                Download CSV
              </button>
            )}
            {nestedObjectType && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                style={{ backgroundColor: `${accent}15`, color: accent, border: `1px solid ${accent}40` }}
              >
                Upload CSV
              </button>
            )}
            {hasUploadedCsv && (
              <button
                onClick={onPushAllUpdates}
                disabled={bulkLoading}
                className="px-6 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: accent, color: colors.background }}
              >
                {bulkLoading ? "Saving..." : "Save"}
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${colors.border}` }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: `${accent}10` }}>
                  {bulkColumns.map((col) => (
                    <th key={col} className="text-left py-4 px-4 text-sm font-bold" style={{ color: colors.text }}>
                      {col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bulkDevices.map((device, idx) => (
                  <tr
                    key={`${device.tin || "device"}-${idx}`}
                    style={{
                      borderBottom: idx < bulkDevices.length - 1 ? `1px solid ${colors.border}` : "none",
                    }}
                  >
                    {bulkColumns.map((col) => (
                      <td key={col} className="py-4 px-4">
                        {col === "led_color" ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-lg border-2"
                              style={{ backgroundColor: String(device[col]) || "#fff", borderColor: colors.border }}
                            />
                            <span className="text-sm font-mono" style={{ color: colors.text }}>
                              {String(device[col] || "")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: colors.text }}>
                            {String(device[col] ?? "")}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default RetailEpdTab;
