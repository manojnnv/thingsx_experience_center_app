"use client";

import React from "react";
import { colors } from "@/config/theme";
import DateTimePicker from "@/app/component/date-time-picker/DateTimePicker";
import type { HeatmapRange, ProductInteractionData, ZoneHeatmapData } from "@/app/services/heatmap/heatmap";
import type { SelectedZone } from "./types";

function RetailAnalyticsTab({
  accent,
  analyticsType,
  onAnalyticsTypeChange,
  onDateRangeChange,
  onSubmit,
  analyticsLoading,
  zoneHeatmapData,
  productInteractionData,
  heatmapRange,
  layoutData,
  getCountValue,
  onZoneClick,
  isZoneDrawerOpen,
  selectedZone,
  selectedZoneData,
  onCloseDrawer,
}: {
  accent: string;
  analyticsType: "zone" | "product";
  onAnalyticsTypeChange: (type: "zone" | "product") => void;
  onDateRangeChange: (value: Date[] | null) => void;
  onSubmit: () => void;
  analyticsLoading: boolean;
  zoneHeatmapData: ZoneHeatmapData[];
  productInteractionData: ProductInteractionData[];
  heatmapRange: HeatmapRange;
  layoutData: unknown;
  getCountValue: (item: ZoneHeatmapData | ProductInteractionData) => number | null | undefined;
  onZoneClick: (zoneId: string, zoneName: string) => void;
  isZoneDrawerOpen: boolean;
  selectedZone: SelectedZone;
  selectedZoneData: ZoneHeatmapData | ProductInteractionData[] | null;
  onCloseDrawer: () => void;
}) {
  const currentData = analyticsType === "zone" ? zoneHeatmapData : productInteractionData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: colors.text }}>
            Retail Analytics
          </h2>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            Heatmaps for zone traffic and product interaction (demographics supported)
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 rounded-xl" style={{ backgroundColor: colors.backgroundCard }}>
          <button
            onClick={() => onAnalyticsTypeChange("zone")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: analyticsType === "zone" ? accent : "transparent",
              color: analyticsType === "zone" ? colors.background : colors.textMuted,
            }}
          >
             Retail Analytics
          </button>
          <button
            onClick={() => onAnalyticsTypeChange("product")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: analyticsType === "product" ? accent : "transparent",
              color: analyticsType === "product" ? colors.background : colors.textMuted,
            }}
          >
             Product Interaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="p-4 rounded-xl flex flex-col gap-3"
        style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}
      >
        <DateTimePicker
          onchange={onDateRangeChange}
          onsubmit={onSubmit}
        />
        <p className="text-xs" style={{ color: colors.textMuted }}>
          Pick a date-time range and click Submit to refresh heatmaps.
        </p>
      </div>

      {/* Layout placeholder */}
      <div
        className="p-4 rounded-xl border"
        style={{ backgroundColor: colors.backgroundCard, borderColor: colors.border }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{ color: colors.text }}>
            Store Layout & Heatmap
          </h3>
          <span className="text-xs" style={{ color: colors.textMuted }}>
            Layout rendering will use provided map once shared.
          </span>
        </div>
        <div
          className="h-72 rounded-lg flex items-center justify-center text-sm"
          style={{ backgroundColor: colors.background, border: `1px dashed ${colors.border}` }}
        >
          {layoutData ? "Layout loaded. Awaiting final rendering instructions." : "Layout will appear here when provided."}
        </div>
      </div>

      {/* Loading */}
      {analyticsLoading && (
        <div
          className="flex items-center justify-center h-64 rounded-xl"
          style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}
        >
          <div className="text-center">
            <div
              className="w-10 h-10 mx-auto mb-3 rounded-full animate-spin"
              style={{ border: `3px solid ${colors.border}`, borderTopColor: accent }}
            />
            <p className="text-sm" style={{ color: colors.textMuted }}>
              Fetching heatmap data...
            </p>
          </div>
        </div>
      )}

      {/* Stats + Table */}
      {!analyticsLoading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="p-4 rounded-xl text-center"
              style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}
            >
              <div className="text-3xl font-bold" style={{ color: accent }}>
                {currentData.length}
              </div>
              <div className="text-sm" style={{ color: colors.textMuted }}>
                {analyticsType === "zone" ? "Tracked Zones" : "Tracked Products"}
              </div>
            </div>
            <div
              className="p-4 rounded-xl text-center"
              style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}
            >
              <div className="text-3xl font-bold" style={{ color: accent }}>
                {heatmapRange.max}
              </div>
              <div className="text-sm" style={{ color: colors.textMuted }}>
                {analyticsType === "zone" ? "Peak Visitors" : "Max Interactions"}
              </div>
            </div>
            <div
              className="p-4 rounded-xl text-center"
              style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}
            >
              <div className="text-3xl font-bold" style={{ color: accent }}>
                {currentData.length > 0
                  ? Math.round(
                      currentData.reduce((sum, item) => sum + (getCountValue(item as any) || 0), 0) / currentData.length
                    )
                  : 0}
              </div>
              <div className="text-sm" style={{ color: colors.textMuted }}>
                {analyticsType === "zone" ? "Avg Visitors / Zone" : "Avg Interactions"}
              </div>
            </div>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}
          >
            <div className="p-4 border-b" style={{ borderColor: colors.border }}>
              <h3 className="font-semibold" style={{ color: colors.text }}>
                {analyticsType === "zone" ? "Zone Details" : "Product Interaction Details"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: `${colors.background}80` }}>
                    {analyticsType === "zone" ? (
                      <>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.textMuted }}>
                          Zone Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.textMuted }}>
                          Zone ID
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: colors.textMuted }}>
                          Visitors
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: colors.textMuted }}>
                          Action
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.textMuted }}>
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.textMuted }}>
                          Zone
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: colors.textMuted }}>
                          Interactions
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: colors.textMuted }}>
                          Action
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {currentData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center" style={{ color: colors.textMuted }}>
                        No data available. Try adjusting the date range.
                      </td>
                    </tr>
                  ) : (
                    currentData.map((item, idx) => (
                      <tr key={idx} className="border-t" style={{ borderColor: colors.border }}>
                        {analyticsType === "zone" ? (
                          <>
                            <td className="px-4 py-3 font-medium" style={{ color: colors.text }}>
                              {(item as ZoneHeatmapData).zone_name || `Zone ${item.zone_id}`}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono" style={{ color: colors.textMuted }}>
                              {item.zone_id}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className="inline-block px-3 py-1 rounded-full text-sm font-bold"
                                style={{ backgroundColor: `${accent}20`, color: accent }}
                              >
                                {getCountValue(item as ZoneHeatmapData) ?? "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => onZoneClick(String(item.zone_id), (item as ZoneHeatmapData).zone_name || `Zone ${item.zone_id}`)}
                                className="px-3 py-1 rounded-lg text-sm font-medium transition-all hover:scale-105"
                                style={{ backgroundColor: `${accent}20`, color: accent }}
                              >
                                Details
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-medium" style={{ color: colors.text }}>
                              {(item as ProductInteractionData).product_name || (item as ProductInteractionData).alias || "—"}
                            </td>
                            <td className="px-4 py-3 text-sm" style={{ color: colors.textMuted }}>
                              {(item as ProductInteractionData).zone_name || `Zone ${item.zone_id}`}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className="inline-block px-3 py-1 rounded-full text-sm font-bold"
                                style={{ backgroundColor: `${accent}20`, color: accent }}
                              >
                                {(item as ProductInteractionData).interaction_count ?? "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() =>
                                  onZoneClick(
                                    String((item as ProductInteractionData).zone_id),
                                    (item as ProductInteractionData).zone_name || `Zone ${(item as ProductInteractionData).zone_id}`
                                  )
                                }
                                className="px-3 py-1 rounded-lg text-sm font-medium transition-all hover:scale-105"
                                style={{ backgroundColor: `${accent}20`, color: accent }}
                              >
                                Details
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drawer */}
          {isZoneDrawerOpen && (
            <div className="fixed inset-0 z-50 flex justify-end" onClick={onCloseDrawer}>
              <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
              <div
                className="relative w-full max-w-md h-full overflow-y-auto"
                style={{ backgroundColor: colors.backgroundCard }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold" style={{ color: colors.text }}>
                      {analyticsType === "zone" ? `Zone Analytics: ${selectedZone.name}` : `Zone: ${selectedZone.name}`}
                    </h3>
                    <button
                      onClick={onCloseDrawer}
                      className="p-2 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: colors.background }}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={colors.textMuted} strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {!selectedZoneData ? (
                    <div className="text-center py-8" style={{ color: colors.textMuted }}>
                      No details available for this selection.
                    </div>
                  ) : analyticsType === "zone" ? (
                    <div className="space-y-4">
                      <div
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
                      >
                        <div className="text-sm mb-1" style={{ color: colors.textMuted }}>
                          Zone Name
                        </div>
                        <div className="font-semibold" style={{ color: colors.text }}>
                          {(selectedZoneData as ZoneHeatmapData).zone_name || selectedZone.name}
                        </div>
                      </div>
                      <div
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
                      >
                        <div className="text-sm mb-1" style={{ color: colors.textMuted }}>
                          Visitor Count
                        </div>
                        <div className="text-3xl font-bold" style={{ color: accent }}>
                          {getCountValue(selectedZoneData as ZoneHeatmapData) ?? "—"}
                        </div>
                      </div>
                      {(selectedZoneData as ZoneHeatmapData).demographics && (
                        <div
                          className="p-4 rounded-xl"
                          style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
                        >
                          <div className="text-sm font-semibold mb-3" style={{ color: colors.text }}>
                            Demographics
                          </div>
                          {Object.entries((selectedZoneData as ZoneHeatmapData).demographics || {}).map(([key, val]) => (
                            <div key={key} className="mb-2">
                              <div className="text-xs font-medium mb-1" style={{ color: colors.textMuted }}>
                                {key}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(val || {}).map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="px-2 py-1 rounded text-xs"
                                    style={{ backgroundColor: `${accent}20`, color: accent }}
                                  >
                                    {k}: {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(Array.isArray(selectedZoneData) ? (selectedZoneData as ProductInteractionData[]) : []).map((product, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl"
                          style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-semibold" style={{ color: colors.text }}>
                                {product.product_name || product.alias || "Unknown Product"}
                              </div>
                              <div className="text-xs" style={{ color: colors.textMuted }}>
                                ID: {product.product_id || "—"}
                              </div>
                            </div>
                            <span
                              className="px-3 py-1 rounded-full text-sm font-bold"
                              style={{ backgroundColor: `${accent}20`, color: accent }}
                            >
                              {product.interaction_count}
                            </span>
                          </div>
                          {product.demographics && Object.keys(product.demographics).length > 0 && (
                            <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                              <div className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>
                                Demographics
                              </div>
                              {Object.entries(product.demographics).map(([key, val]) => (
                                <div key={key} className="mb-2">
                                  <div className="text-xs" style={{ color: colors.textMuted }}>
                                    {key}
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Object.entries(val || {}).map(([k, v]) => (
                                      <span
                                        key={k}
                                        className="px-2 py-0.5 rounded text-xs"
                                        style={{ backgroundColor: `${accent}10`, color: accent }}
                                      >
                                        {k}: {v}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {(!Array.isArray(selectedZoneData) || selectedZoneData.length === 0) && (
                        <div className="text-center py-6" style={{ color: colors.textMuted }}>
                          No products found for this zone.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RetailAnalyticsTab;
