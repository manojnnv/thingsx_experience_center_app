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
} from "@/app/services/assets/asset";
import { formatDateAndTime } from "@/app/utils/dateTime";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { colors } from "@/config/theme";

type Asset = {
  asset_id: string;
  asset_name: string;
  asset_cross_ref_code: string;
  asset_type: string;
  passive_tracking?: boolean;
};

interface WarehousePassiveTrackingTabProps {
  accentColor?: string;
}

function WarehousePassiveTrackingTab({
  accentColor = colors.warehouseAccent,
}: WarehousePassiveTrackingTabProps) {
  const [loading, setLoading] = useState(false);
  const [selectAsset, setSelectedAsset] = useState<string>();
  const [dateAndTime, setDateAndTime] = useState<string[]>([]);
  const [columnsData, setColumnsData] = useState<{ field: string }[]>([]);
  const [rowsData, setRowsData] = useState<Record<string, any>[]>([]);
  const [allAsset, setAllAsset] = useState<Asset[]>([]);

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

  const fetchAssetsByDateTime = async () => {
    setLoading(true);
    try {
      const response = await passiveAssetTracking({
        asset_id: selectAsset || "",
        startDate: dateAndTime[0],
        endDate: dateAndTime[1],
      });
      const uniqueData = response ?? [];

      const columnKeys =
        uniqueData.length > 0 ? Object.keys(uniqueData[0]) : [];
      const columnData = columnKeys.map((item) => ({
        field: item,
        filter: "agTextColumnFilter",
      }));

      setColumnsData(columnData);
      setRowsData(uniqueData);
    } catch {
      // error is already handled by the service via toast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchAssets = async () => {
      setLoading(true);
      try {
        const siteID = localStorage.getItem("site_id") || "";
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

      <div className="flex justify-between items-center mb-4">
        <div
          className="text-lg font-semibold"
          style={{ color: accentColor }}
        >
          Passive Tracking
        </div>

        <div className="flex items-end gap-3">
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
          data={rowsData}
        />
      </div>
    </div>
  );
}

export default WarehousePassiveTrackingTab;
