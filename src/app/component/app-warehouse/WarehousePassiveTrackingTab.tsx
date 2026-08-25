"use client";

import React, { useEffect, useState } from "react";
import { DataTable } from "@/app/component/app-data-table/data-table";
import AppSelect from "@/app/component/app-select/AppSelect";
import AppLoading from "@/app/component/app-loading/AppLoading";
import DateTimePicker from "@/app/component/date-time-picker/DateTimePicker";
import { Button } from "@/app/components/ui/button";
import {
  getAllAssetData,
  passiveAssetTracking,
  passiveAssetTrackingRoadmap,
} from "@/app/services/assets/asset";
import { formatDateAndTime } from "@/app/utils/dateTime";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MapPin, Table2, GitCommitHorizontal } from "lucide-react";
import { colors } from "@/config/theme";
import { getSiteId } from "@/config/site";

type Asset = {
  asset_id: string;
  asset_name: string;
  asset_cross_ref_code: string;
  asset_type: string;
  passive_tracking?: boolean;
};

type PassiveTrackingRecord = {
  from_time: string;
  to_time: string;
  asset_name: string;
  passive_tag_id: string;
  located_tin: string;
  located_zone_name: string;
};

interface WarehousePassiveTrackingTabProps {
  accentColor?: string;
}

/** Format a datetime string to a short, readable form */
function formatShortTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/** Compute duration between two datetime strings */
function getDuration(from: string, to: string): string {
  try {
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    const diffMs = toMs - fromMs;
    if (diffMs < 0) return "";
    const totalMins = Math.round(diffMs / 60000);
    if (totalMins < 60) return `${totalMins}m`;
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  } catch {
    return "";
  }
}

/** ─── Roadmap Component ─── */
function PassiveTrackingRoadmap({
  data,
  accentColor,
}: {
  data: PassiveTrackingRecord[];
  accentColor: string;
}) {
  // Sort chronologically (earliest first)
  const sorted = [...data].sort(
    (a, b) => new Date(a.from_time).getTime() - new Date(b.from_time).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-3"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        <MapPin size={48} strokeWidth={1} />
        <p className="text-sm">No tracking data to display. Select an asset and run the query.</p>
      </div>
    );
  }

  const lastIndex = sorted.length - 1;

  // Height of the circle wrapper div — line is vertically centered inside it
  const CIRCLE_WRAP_H = 80; // px
  const LINE_TOP = CIRCLE_WRAP_H / 2; // 40px — circle center

  /** Half-connector segment: a flex-1 horizontal line at circle-center height */
  const connectorStyle = (visible: boolean): React.CSSProperties => ({
    flex: 1,
    height: "2px",
    alignSelf: "flex-start",
    marginTop: `${LINE_TOP - 1}px`, // centers the 2px line on the circle midpoint
    background: visible
      ? `linear-gradient(to right, ${accentColor}99, ${accentColor}cc)`
      : "transparent",
    boxShadow: visible ? `0 0 6px ${accentColor}50` : "none",
    borderRadius: "2px",
  });

  return (
    <div className="w-full overflow-x-auto py-8 px-6">
      {/* Asset header */}
      <div className="flex items-center gap-2 mb-8 px-2">
        <div
          className="text-xs font-mono px-2 py-1 rounded"
          style={{
            backgroundColor: `${accentColor}18`,
            color: accentColor,
            border: `1px solid ${accentColor}40`,
          }}
        >
          TAG: {sorted[0]?.passive_tag_id ?? "—"}
        </div>
        <div
          className="text-xs font-mono px-2 py-1 rounded"
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {sorted[0]?.asset_name ?? "Unknown Asset"}
        </div>
        <div
          className="text-xs px-2 py-1 rounded ml-auto"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {sorted.length} stop{sorted.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/*
        Timeline layout:
        Each node is a flex row: [left-half connector] | [circle + card] | [right-half connector]
        - First node: left connector is transparent  → no line before first circle
        - Last  node: right connector is transparent → no line after last circle
        - Adjacent halves from neighbouring nodes meet at each other's circle center
      */}
      <div
        className="flex items-start"
        style={{ minWidth: `${Math.max(sorted.length * 200, 600)}px` }}
      >
        {sorted.map((stop, idx) => {
          const isLast = idx === lastIndex;
          const isFirst = idx === 0;
          const duration = getDuration(stop.from_time, stop.to_time);

          return (
            <div
              key={`${stop.located_tin}-${idx}`}
              className="flex items-start"
              style={{ flex: 1, minWidth: 0 }}
            >
              {/* Left connector half — hidden on the first node */}
              <div style={connectorStyle(!isFirst)} />

              {/* Circle + card column */}
              <div className="flex flex-col items-center flex-shrink-0">
                {/* Circle wrapper */}
                <div
                  className="relative flex items-center justify-center"
                  style={{ height: `${CIRCLE_WRAP_H}px`, width: "52px" }}
                >
                  {/* Pulse ring — last node only */}
                  {isLast && (
                    <div
                      className="absolute rounded-full animate-ping"
                      style={{
                        width: "36px",
                        height: "36px",
                        backgroundColor: `${accentColor}30`,
                        animationDuration: "2s",
                      }}
                    />
                  )}

                  {/* Outer glow ring */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: "32px",
                      height: "32px",
                      backgroundColor: isLast
                        ? `${accentColor}25`
                        : "rgba(255,255,255,0.04)",
                      border: `2px solid ${isLast ? accentColor : accentColor + "60"}`,
                      boxShadow: isLast ? `0 0 16px ${accentColor}50` : "none",
                    }}
                  />

                  {/* Inner dot */}
                  <div
                    className="rounded-full relative z-10"
                    style={{
                      width: "14px",
                      height: "14px",
                      backgroundColor: isLast ? accentColor : accentColor + "aa",
                      boxShadow: isLast ? `0 0 10px ${accentColor}` : "none",
                    }}
                  />
                </div>

                {/* Stop info card */}
                <div
                  className="rounded-lg p-3 text-center transition-all duration-200"
                  style={{
                    width: "148px",
                    backgroundColor: isLast
                      ? `${accentColor}10`
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isLast ? accentColor + "40" : "rgba(255,255,255,0.07)"}`,
                    boxShadow: isLast ? `0 0 20px ${accentColor}15` : "none",
                  }}
                >
                  {/* Zone name */}
                  <div
                    className="text-xs font-semibold truncate mb-1"
                    style={{ color: isLast ? accentColor : "rgba(255,255,255,0.85)" }}
                    title={stop.located_zone_name}
                  >
                    {stop.located_zone_name}
                  </div>

                  {/* TIN badge */}
                  <div
                    className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded mb-2"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.4)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {stop.located_tin}
                  </div>

                  {/* Time range */}
                  <div className="space-y-0.5">
                    <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {formatShortDate(stop.from_time)}
                    </div>
                    <div
                      className="text-[11px] font-medium"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      {formatShortTime(stop.from_time)}
                    </div>
                    <div
                      className="text-[10px]"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      ↓
                    </div>
                    <div
                      className="text-[11px] font-medium"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      {formatShortTime(stop.to_time)}
                    </div>
                  </div>

                  {/* Duration pill */}
                  {duration && (
                    <div
                      className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isLast
                          ? `${accentColor}20`
                          : "rgba(255,255,255,0.05)",
                        color: isLast ? accentColor : "rgba(255,255,255,0.35)",
                        border: `1px solid ${isLast ? accentColor + "30" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      {duration}
                    </div>
                  )}

                  {/* Last Seen badge — final node */}
                  {isLast && (
                    <div
                      className="mt-2 text-[9px] font-semibold uppercase tracking-wider"
                      style={{ color: accentColor }}
                    >
                      ● Last Seen
                    </div>
                  )}
                  {/* Start label — first node when there are multiple */}
                  {isFirst && !isLast && (
                    <div
                      className="mt-2 text-[9px] uppercase tracking-wider"
                      style={{ color: "rgba(255,255,255,0.2)" }}
                    >
                      Start
                    </div>
                  )}
                </div>
              </div>

              {/* Right connector half — hidden on the last node */}
              <div style={connectorStyle(!isLast)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** ─── Main Tab Component ─── */
function WarehousePassiveTrackingTab({
  accentColor = colors.warehouseAccent,
}: WarehousePassiveTrackingTabProps) {
  const [loading, setLoading] = useState(false);
  const [selectAsset, setSelectedAsset] = useState<string>();
  const [dateAndTime, setDateAndTime] = useState<string[]>([]);
  // Roadmap uses the experience-center API; table uses the legacy passive-tracking API
  const [roadmapData, setRoadmapData] = useState<PassiveTrackingRecord[]>([]);
  const [columnsData, setColumnsData] = useState<{ field: string }[]>([]);
  const [tableData, setTableData] = useState<PassiveTrackingRecord[]>([]);
  const [allAsset, setAllAsset] = useState<Asset[]>([]);
  /** "roadmap" is default; "table" is the legacy view */
  const [viewMode, setViewMode] = useState<"roadmap" | "table">("roadmap");

  const generateColumns = (keys: string[]): ColumnDef<any>[] => {
    return keys.map((key) => ({
      accessorKey: key,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          style={{ color: colors.text }}
        >
          {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.getValue(key);
        return key === "led_color" ? (
          <div className="flex items-center justify-start gap-2 px-2 py-1">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: value as string }}
            />
          </div>
        ) : (
          <div className="ml-2" style={{ color: colors.text }}>
            {value as string}
          </div>
        );
      },
    }));
  };

  const onSelectAsset = (asset: string | undefined) => {
    setSelectedAsset(asset);
  };

  const onChangeDateAndTime = (date: any) => {
    const isoDates = formatDateAndTime(date);
    setDateAndTime(isoDates);
  };

  /** Fetch roadmap data from the experience-center endpoint */
  const fetchRoadmapData = async () => {
    setLoading(true);
    try {
      const response = await passiveAssetTrackingRoadmap({
        asset_id: selectAsset || "",
        startDate: dateAndTime[0],
        endDate: dateAndTime[1],
      });
      setRoadmapData(response ?? []);
    } catch {
      // error is already handled by the service via toast
    } finally {
      setLoading(false);
    }
  };

  /** Fetch table data from the original passive-tracking endpoint */
  const fetchTableData = async (assetId?: string, dates?: string[]) => {
    setLoading(true);
    try {
      const response = await passiveAssetTracking({
        asset_id: assetId ?? selectAsset ?? "",
        startDate: dates?.[0] ?? dateAndTime[0],
        endDate: dates?.[1] ?? dateAndTime[1],
      });
      const uniqueData: PassiveTrackingRecord[] = response ?? [];
      const columnKeys =
        uniqueData.length > 0 ? Object.keys(uniqueData[0]) : [];
      setColumnsData(
        columnKeys.map((item) => ({ field: item, filter: "agTextColumnFilter" }))
      );
      setTableData(uniqueData);
    } catch {
      // error is already handled by the service via toast
    } finally {
      setLoading(false);
    }
  };

  /**
   * Called by DateTimePicker submit button.
   * Always fetches roadmap (the primary/default view).
   * If the user is already on table view, fetch table data instead.
   */
  const fetchAssetsByDateTime = async () => {
    if (viewMode === "table") {
      await fetchTableData();
    } else {
      await fetchRoadmapData();
    }
  };

  /** Handle view-mode toggle: auto-fetch table data when switching to table */
  const handleViewModeChange = async (mode: "roadmap" | "table") => {
    setViewMode(mode);
    if (mode === "table") {
      await fetchTableData();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchAssets = async () => {
      setLoading(true);
      try {
        const siteID = getSiteId();
        const response = await getAllAssetData(siteID);
        if (cancelled) return;
        const passiveTracking = (response ?? []).filter(
          (asset: any) => asset?.passive_tracking === true
        );
        setAllAsset(passiveTracking);
      } catch {
        // error handled by service
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50 rounded-lg"
          style={{ backgroundColor: `${colors.background}cc` }}
        >
          <AppLoading message="Loading passive tracking data..." />
        </div>
      )}

      {/* ── Header row ── */}
      <div className="flex justify-between items-center mb-4">
        <div
          className="text-lg font-semibold"
          style={{ color: accentColor }}
        >
          Passive Tracking
        </div>

        <div className="flex items-end gap-3">
          {/* View mode toggle */}
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: `1px solid ${accentColor}40` }}
          >
            <button
              onClick={() => handleViewModeChange("roadmap")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor:
                  viewMode === "roadmap" ? `${accentColor}20` : "transparent",
                color:
                  viewMode === "roadmap"
                    ? accentColor
                    : "rgba(255,255,255,0.4)",
                borderRight: `1px solid ${accentColor}30`,
              }}
            >
              <GitCommitHorizontal size={14} />
              Roadmap
            </button>
            <button
              onClick={() => handleViewModeChange("table")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor:
                  viewMode === "table" ? `${accentColor}20` : "transparent",
                color:
                  viewMode === "table"
                    ? accentColor
                    : "rgba(255,255,255,0.4)",
              }}
            >
              <Table2 size={14} />
              Table
            </button>
          </div>

          <div className="w-56">
            <AppSelect
              className="w-full"
              label="Select Asset"
              value={selectAsset}
              onchange={onSelectAsset}
              options={(allAsset ?? []).map((item) => ({
                label: item.asset_name,
                value: String(item.asset_id),
              }))}
            />
          </div>
          <div>
            <DateTimePicker
              onchange={onChangeDateAndTime}
              onsubmit={fetchAssetsByDateTime}
            />
          </div>
        </div>
      </div>

      {/* ── Content area ── */}
      {viewMode === "roadmap" ? (
        <div
          className="rounded-lg"
          style={{
            backgroundColor: colors.backgroundCard,
            border: `1px solid ${colors.border}`,
            minHeight: "340px",
          }}
        >
          <PassiveTrackingRoadmap data={roadmapData} accentColor={accentColor} />
        </div>
      ) : (
        <div
          className="rounded-lg"
          style={{
            backgroundColor: colors.backgroundCard,
            border: `1px solid ${colors.border}`,
          }}
        >
          <DataTable
            columns={generateColumns(
              (columnsData || []).map((col) => col.field)
            )}
            data={tableData}
          />
        </div>
      )}
    </div>
  );
}

export default WarehousePassiveTrackingTab;
