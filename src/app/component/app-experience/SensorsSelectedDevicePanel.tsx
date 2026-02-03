"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { colors } from "@/config/theme";
import type { DisplayDevice, SensorLiveData } from "./types";
import AppTabs from "@/app/component/app-tabs/AppTabs";
import {
  getDeviceConfig,
  getDeviceDetails,
  updateDeviceConfig,
} from "@/app/services/sensors/sensors";
import { formatDateTime } from "@/app/utils/dateTime";

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

  type ConfigSchemaProperty = {
    type?: string;
    title?: string;
    description?: string;
    default?: string | number;
    data?: string | number;
    readOnly?: boolean;
    ui?: {
      widget?: string;
    };
    validators?: Array<{ type?: string; pattern?: string; min?: number; max?: number }>;
    properties?: Record<string, ConfigSchemaProperty>;
  };

  type ConfigSchema = {
    version?: string;
    type?: string;
    properties?: Record<string, ConfigSchemaProperty>;
  };

  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSchema, setConfigSchema] = useState<ConfigSchema | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [configSaving, setConfigSaving] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadDetails = async () => {
      setDetailsLoading(true);
      setDetailsError(null);
      const result = await getDeviceDetails(selectedDevice.tin);
      if (mounted) {
        if (result.error) {
          setDetailsError(result.error);
          setDeviceDetails(null);
        } else {
          setDeviceDetails(result.data || null);
        }
      }
      if (mounted) {
        setDetailsLoading(false);
      }
    };

    const loadConfig = async () => {
      setConfigLoading(true);
      setConfigError(null);
      const result = await getDeviceConfig(selectedDevice.tin);
      if (mounted) {
        if (result.error) {
          setConfigError(result.error);
          setConfigSchema(null);
          setConfigValues({});
        } else {
          const schema = (result.data || null) as ConfigSchema | null;
          setConfigSchema(schema);
          setConfigValues(extractInitialData(schema));
        }
        setConfigLoading(false);
      }
    };

    loadConfig();
    loadDetails();

    return () => {
      mounted = false;
    };
  }, [selectedDevice.tin]);

  const extractInitialData = useCallback((schema: ConfigSchema | null) => {
    if (!schema?.properties) return {};
    const walk = (properties: Record<string, ConfigSchemaProperty>) => {
      const result: Record<string, unknown> = {};
      Object.entries(properties).forEach(([key, prop]) => {
        if (prop.type === "object" && prop.properties) {
          result[key] = walk(prop.properties);
        } else {
          result[key] =
            prop.data ??
            prop.default ??
            (prop.type === "number" ? 0 : prop.type === "string" ? "" : "");
        }
      });
      return result;
    };
    return walk(schema.properties);
  }, []);

  const handleValueChange = useCallback(
    (path: string[], value: string | number) => {
      setConfigValues((prev) => {
        const updated: Record<string, unknown> = { ...prev };
        let cursor: Record<string, unknown> = updated;
        path.forEach((segment, index) => {
          if (index === path.length - 1) {
            cursor[segment] = value;
          } else {
            const next = cursor[segment];
            cursor[segment] =
              next && typeof next === "object" ? { ...(next as object) } : {};
            cursor = cursor[segment] as Record<string, unknown>;
          }
        });
        return updated;
      });
    },
    []
  );

  const handleSaveConfig = useCallback(async () => {
    setConfigSaving(true);
    try {
      const result = await updateDeviceConfig(selectedDevice.tin, configValues);
      if (result.error) {
        setConfigError(result.error);
      }
    } finally {
      setConfigSaving(false);
    }
  }, [configValues, selectedDevice.tin]);

  const detailsContent = (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
          style={{ backgroundColor: `${colors.sensorAccent}20` }}
        >
          {selectedDevice.icon && (selectedDevice.icon.startsWith("http") || selectedDevice.icon.startsWith("/")) ? (
            <div
              className="w-8 h-8 shrink-0"
              style={{
                backgroundColor: colors.sensorAccent,
                maskImage: `url(${selectedDevice.icon})`,
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskImage: `url(${selectedDevice.icon})`,
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
              }}
              role="img"
              aria-label=""
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.sensorAccent}
              strokeWidth={1.5}
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546"
              />
            </svg>
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
            {selectedDevice.name}
          </h3>
        </div>
      </div>

      <div
        className="rounded-xl border p-4"
        style={{ borderColor: colors.border, backgroundColor: colors.backgroundCard }}
      >
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="space-y-3">
            <div>
              <div className="font-semibold" style={{ color: colors.text }}>
                Device Name
              </div>
              <div style={{ color: colors.textMuted }}>
                {deviceDetails?.device_name || selectedDevice.name}
              </div>
            </div>
            <div>
              <div className="font-semibold" style={{ color: colors.text }}>
                Device TIN
              </div>
              <div style={{ color: colors.textMuted }}>
                {deviceDetails?.tin || selectedDevice.tin}
              </div>
            </div>
            <div>
              <div className="font-semibold" style={{ color: colors.text }}>
                Device Nick Name
              </div>
              <div style={{ color: colors.textMuted }}>
                {deviceDetails?.device_nick_name || selectedDevice.name}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="font-semibold" style={{ color: colors.text }}>
                Device Type
              </div>
              <div style={{ color: colors.textMuted }}>
                {deviceDetails?.device_type || selectedDevice.type}
              </div>
            </div>
            <div>
              <div className="font-semibold" style={{ color: colors.text }}>
                Ref TIN
              </div>
              <div style={{ color: colors.textMuted }}>
                {deviceDetails?.ref_tin || centralEndnode.displayName}
              </div>
            </div>
            <div>
              <div className="font-semibold" style={{ color: colors.text }}>
                Location Info
              </div>
              <div style={{ color: colors.textMuted }}>
                {deviceDetails?.location_info || "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border p-4"
        style={{ borderColor: colors.border, backgroundColor: colors.backgroundCard }}
      >
        <div className="font-semibold mb-3" style={{ color: colors.text }}>
          Latest Data
        </div>
        {detailsLoading && (
          <p className="text-sm" style={{ color: colors.textMuted }}>
            Loading latest data...
          </p>
        )}
        {!detailsLoading && detailsError && (
          <p className="text-sm" style={{ color: colors.textMuted }}>
            {detailsError}
          </p>
        )}
        {!detailsLoading && deviceDetails?.latest_data && (
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(deviceDetails.latest_data).map(
              ([key, value]: any) => (
                <div
                  key={key}
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div className="text-sm font-semibold" style={{ color: colors.text }}>
                    {key} Value
                  </div>
                  <div className="text-sm" style={{ color: colors.textMuted }}>
                    {value?.value ?? "N/A"}
                  </div>
                  <div className="text-sm font-semibold mt-2" style={{ color: colors.text }}>
                    {key} Time
                  </div>
                  <div className="text-sm" style={{ color: colors.textMuted }}>
                    {value?.timestamp ? formatDateTime(value.timestamp) : "N/A"}
                  </div>
                </div>
              )
            )}
          </div>
        )}
        {!detailsLoading && !deviceDetails?.latest_data && (
          <p className="text-sm" style={{ color: colors.textMuted }}>
            No latest data available.
          </p>
        )}
      </div>
    </div>
  );

  const configEntries = useMemo(() => {
    return Object.entries(configSchema?.properties || {});
  }, [configSchema]);

  const renderField = (
    path: string[],
    key: string,
    prop: ConfigSchemaProperty
  ) => {
    const currentPath = [...path, key];
    if (prop.type === "object" && prop.properties) {
      return (
        <div
          key={currentPath.join(".")}
          className="rounded-xl p-4 space-y-3"
          style={{
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
          }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: colors.text }}>
              {prop.title || key}
            </p>
            {prop.description && (
              <p className="text-xs" style={{ color: colors.textMuted }}>
                {prop.description}
              </p>
            )}
          </div>
          <div className="grid gap-3">
            {Object.entries(prop.properties).map(([childKey, childProp]) =>
              renderField(currentPath, childKey, childProp)
            )}
          </div>
        </div>
      );
    }

    const value = currentPath.reduce<unknown>((acc, segment) => {
      if (acc && typeof acc === "object") {
        return (acc as Record<string, unknown>)[segment];
      }
      return undefined;
    }, configValues);

    const widget = prop.ui?.widget;
    const isNumber = prop.type === "number" || widget === "number";

    return (
      <div key={currentPath.join(".")} className="grid gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold" style={{ color: colors.text }}>
            {prop.title || key}
          </label>
          {prop.description && (
            <span className="text-[10px]" style={{ color: colors.textMuted }}>
              {prop.description}
            </span>
          )}
        </div>
        {widget === "color-picker" ? (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={String(value ?? prop.default ?? "#ffffff")}
              disabled={prop.readOnly}
              onChange={(event) =>
                handleValueChange(currentPath, event.target.value)
              }
              className="h-10 w-12 rounded-md border"
              style={{ borderColor: colors.border, backgroundColor: colors.background }}
            />
            <input
              type="text"
              value={String(value ?? prop.default ?? "")}
              disabled={prop.readOnly}
              onChange={(event) =>
                handleValueChange(currentPath, event.target.value)
              }
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                color: colors.text,
              }}
            />
          </div>
        ) : (
          <input
            type={isNumber ? "number" : "text"}
            value={value !== undefined && value !== null ? String(value) : ""}
            disabled={prop.readOnly}
            onChange={(event) =>
              handleValueChange(
                currentPath,
                isNumber ? Number(event.target.value) : event.target.value
              )
            }
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              color: colors.text,
            }}
          />
        )}
      </div>
    );
  };

  const configContent = (
    <div className="space-y-4">
      {configLoading && (
        <p className="text-sm" style={{ color: colors.textMuted }}>
          Loading config...
        </p>
      )}
      {!configLoading && configError && (
        <p className="text-sm" style={{ color: colors.textMuted }}>
          {configError}
        </p>
      )}
      {!configLoading && !configError && configEntries.length === 0 && (
        <p className="text-sm" style={{ color: colors.textMuted }}>
          No config available.
        </p>
      )}
      {!configLoading && !configError && configEntries.length > 0 && (
        <>
          <div className="grid gap-4">
            {configEntries.map(([key, prop]) =>
              renderField([], key, prop as ConfigSchemaProperty)
            )}
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={configSaving}
            className="w-full py-2 rounded-lg font-semibold text-sm transition-all duration-300 disabled:opacity-50"
            style={{ backgroundColor: colors.yellow, color: colors.background }}
          >
            {configSaving ? "Saving..." : "Save Config"}
          </button>
        </>
      )}
    </div>
  );

  const tabs = ["Details", "Config"];
  const tabContents = [detailsContent, configContent];

  return (
    <div className="w-full">
      <div className="w-full flex justify-end">
        <AppTabs
          className="w-full"
          tabs={tabs}
          defaultTab="Details"
          tabContents={tabContents}
          accentColor={colors.sensorAccent}
        />
      </div>
    </div>
  );
}

export default SensorsSelectedDevicePanel;
