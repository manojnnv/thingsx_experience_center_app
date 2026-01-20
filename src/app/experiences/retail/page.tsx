"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { colors } from "@/config/theme";
import { Toaster, toast } from "sonner";
import { useAuth } from "@/app/providers/AuthProvider";
import { AppTabs, TabItem } from "@/components/AppTabs";
import { getCameras, getVideoFeedV2, CameraStream, StreamConfig, ModelConfig } from "@/app/services/realtime/realtime";
import {
  getDeviceCategories,
  getDeviceConfigOptions,
  getEslTemplates,
  retrieveDevicesForBulk,
  pushBulkUpdate,
  DeviceCategory,
  DeviceConfigOption,
  BulkDeviceData,
  EslTemplate,
} from "@/app/services/bulkUpload/bulkUpload";
import {
  fetchZoneCountHeatmap,
  fetchProductInteractionHeatmap,
  getCountValue,
  normalizeHeatmapData,
  calculateHeatmapRange,
  ZoneHeatmapData,
  ProductInteractionData,
  HeatmapRange,
} from "@/app/services/heatmap/heatmap";
import {
  getLayout,
  parseLayoutJson,
  fixLayoutImageUrls,
  sanitizeLayoutObjects,
  LayoutData,
} from "@/app/services/layout/layout";
import { getSiteId } from "@/config/site";
import DateTimePicker from "@/components/DateTimePicker";

// ===========================================
// Page Accent Color
// ===========================================

const accent = colors.retailAccent;

// ===========================================
// Types
// ===========================================

type ActiveTab = "stream" | "epd" | "analytics";

interface DropdownOption {
  value: string;
  label: string;
}

// ===========================================
// Tab Configuration
// ===========================================

const TABS: TabItem[] = [
  { id: "stream", label: "Video Streams", icon: "📹" },
  { id: "epd", label: "Bulk Updates", icon: "🏷️" },
  { id: "analytics", label: "Analytics", icon: "📊" },
];

const templateDevicePrefixes = ["EN0006", "EN0007", "EN0008"];

// ===========================================
// Custom Dropdown Component
// ===========================================

function CustomDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
  disabled = false,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm mb-2 font-medium" style={{ color: colors.textMuted }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-xl text-left transition-all flex items-center justify-between gap-2 group"
        style={{
          backgroundColor: isOpen ? `${accent}10` : colors.background,
          border: `2px solid ${isOpen ? accent : colors.border}`,
          color: selectedOption ? colors.text : colors.textMuted,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke={isOpen ? accent : colors.textMuted}
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div
          className="absolute z-50 mt-2 w-full rounded-xl overflow-hidden shadow-2xl"
          style={{
            backgroundColor: colors.backgroundCard,
            border: `2px solid ${accent}40`,
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-center" style={{ color: colors.textMuted }}>
              No options available
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left transition-all flex items-center gap-3 group"
                style={{
                  backgroundColor: option.value === value ? `${accent}20` : "transparent",
                  color: colors.text,
                }}
                onMouseEnter={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.backgroundColor = `${accent}10`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: option.value === value ? accent : "transparent",
                    border: `2px solid ${option.value === value ? accent : colors.border}`,
                  }}
                />
                <span className="truncate">{option.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Main Component
// ===========================================

export default function RetailExperiencePage() {
  // Auth state
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Page state
  const [showVideo, setShowVideo] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("stream");

  // Stream state
  const [cameras, setCameras] = useState<CameraStream[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraStream | null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoStatus, setVideoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [videoErrorMessage, setVideoErrorMessage] = useState<string>("");
  const [camerasLoading, setCamerasLoading] = useState(false);

  // Stream refs for cleanup
  const previousStreamId = useRef<string | null>(null);
  const previousModel = useRef<string | null>(null);
  const isStreamRunning = useRef(false);

  // EPD Bulk Update state
  const [deviceCategories, setDeviceCategories] = useState<DeviceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [deviceConfigOptions, setDeviceConfigOptions] = useState<DeviceConfigOption[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>("");
  const [selectedSiteId] = useState<string>(getSiteId());
  const [eslTemplates, setEslTemplates] = useState<EslTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [bulkDevices, setBulkDevices] = useState<BulkDeviceData[]>([]);
  const [bulkColumns, setBulkColumns] = useState<string[]>([]);
  const [nestedObjectType, setNestedObjectType] = useState<string>("");
  const [hasUploadedCsv, setHasUploadedCsv] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Analytics state
  const [analyticsType, setAnalyticsType] = useState<"zone" | "product">("zone");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [zoneHeatmapData, setZoneHeatmapData] = useState<ZoneHeatmapData[]>([]);
  const [productInteractionData, setProductInteractionData] = useState<ProductInteractionData[]>([]);
  const [heatmapRange, setHeatmapRange] = useState<HeatmapRange>({ min: 0, max: 0 });
  const [layoutData, setLayoutData] = useState<LayoutData | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: "",
    endDate: "",
  });
  const [selectedZone, setSelectedZone] = useState<{ id: string | null; name: string | null }>({
    id: null,
    name: null,
  });
  const [selectedZoneData, setSelectedZoneData] = useState<ZoneHeatmapData | ProductInteractionData[] | null>(null);
  const [isZoneDrawerOpen, setIsZoneDrawerOpen] = useState(false);

  // ===========================================
  // Derived State
  // ===========================================

  const selectedStream = selectedCamera?.streams.find((s) => s.stream_id === selectedStreamId) || null;

  const streamOptions: DropdownOption[] = selectedCamera?.streams.map((s) => ({
    value: s.stream_id,
    label: s.stream_name || s.stream_id || "Unnamed Stream",
  })) || [];

  // Models - use model_id as value since API expects numeric model_id
  const modelOptions: DropdownOption[] = selectedStream?.models.map((m: ModelConfig) => ({
    value: String(m.model_id),
    label: m.model_name,
  })) || [];

  // ===========================================
  // Load Cameras
  // ===========================================

  useEffect(() => {
    if (!isAuthenticated || authLoading || showVideo) return;

    async function loadCameras() {
      setCamerasLoading(true);
      try {
        const result = await getCameras();
        if (result.data) {
          setCameras(result.data);
          console.log("Loaded cameras:", result.data);
        }
      } catch (error) {
        console.error("Error loading cameras:", error);
      } finally {
        setCamerasLoading(false);
      }
    }

    if (activeTab === "stream") {
      loadCameras();
    }
  }, [isAuthenticated, authLoading, showVideo, activeTab]);

  // ===========================================
  // Load Device Categories
  // ===========================================

  useEffect(() => {
    if (!isAuthenticated || authLoading || showVideo) return;

    async function loadCategories() {
      const result = await getDeviceCategories(selectedSiteId || undefined);
      if (result.data) {
        setDeviceCategories(result.data);
      }
    }

    if (activeTab === "epd") {
      loadCategories();
    }
  }, [isAuthenticated, authLoading, showVideo, activeTab, selectedSiteId]);

  // ===========================================
  // Load Config Options when Category Changes
  // ===========================================

  useEffect(() => {
    if (!selectedCategory) {
      setDeviceConfigOptions([]);
      setEslTemplates([]);
      setSelectedTemplateId("");
      return;
    }

    async function loadConfigOptions() {
      const result = await getDeviceConfigOptions(selectedCategory);
      if (result.data) {
        setDeviceConfigOptions(result.data);
      }
    }

    async function loadTemplates() {
      const isTemplateDevice = templateDevicePrefixes.some((prefix) => selectedCategory.startsWith(prefix));
      if (!isTemplateDevice) {
        setEslTemplates([]);
        setSelectedTemplateId("");
        return;
      }

      const result = await getEslTemplates(selectedCategory);
      if (result.data) {
        setEslTemplates(result.data);
      }
    }

    loadConfigOptions();
    loadTemplates();
  }, [selectedCategory]);

  // ===========================================
  // Analytics data loaders
  // ===========================================

  const fetchHeatmapData = useCallback(async () => {
    if (!isAuthenticated || authLoading || showVideo) return;
    if (activeTab !== "analytics") return;

    setAnalyticsLoading(true);
    try {
      if (analyticsType === "zone") {
        const result = await fetchZoneCountHeatmap({
          siteId: getSiteId(),
          startDate: dateRange.startDate || undefined,
          endDate: dateRange.endDate || undefined,
        });
        if (result.data) {
          const normalized = normalizeHeatmapData(result.data);
          setZoneHeatmapData(normalized);
          setHeatmapRange(calculateHeatmapRange(normalized));
        }
      } else {
        const result = await fetchProductInteractionHeatmap({
          siteId: getSiteId(),
          startDate: dateRange.startDate || undefined,
          endDate: dateRange.endDate || undefined,
        });
        if (result.data) {
          const normalized = normalizeHeatmapData(result.data);
          setProductInteractionData(normalized);
          setHeatmapRange(calculateHeatmapRange(normalized));
        }
      }
    } catch (error) {
      console.error("Error fetching heatmap data:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [isAuthenticated, authLoading, showVideo, activeTab, analyticsType, dateRange]);

  // Load layout + heatmap data when analytics tab opens
  useEffect(() => {
    if (!isAuthenticated || authLoading || showVideo) return;
    if (activeTab !== "analytics") return;

    async function loadLayoutAndData() {
      try {
        const layoutResult = await getLayout();
        if (layoutResult.data) {
          const parsed = parseLayoutJson(layoutResult.data);
          const fixed = fixLayoutImageUrls(parsed);
          const sanitized = sanitizeLayoutObjects(fixed);
          setLayoutData(sanitized);
        }
      } catch (error) {
        console.error("Error loading layout:", error);
      }

      await fetchHeatmapData();
    }

    loadLayoutAndData();
  }, [isAuthenticated, authLoading, showVideo, activeTab, fetchHeatmapData]);

  // ===========================================
  // Stream Handlers
  // ===========================================

  function handleCameraSelect(camera: CameraStream) {
    setSelectedCamera(camera);
    setSelectedStreamId("");
    setSelectedModel("");
    setVideoUrl("");
    setVideoStatus("idle");
  }

  function handleStreamSelect(streamId: string) {
    setSelectedStreamId(streamId);
    setSelectedModel("");
  }

  function handleModelSelect(modelId: string) {
    setSelectedModel(modelId);
  }

  async function startStream() {
    if (!selectedCamera || !selectedStreamId || !selectedModel) {
      toast.error("Please select camera, stream, and model");
      return;
    }

    setVideoStatus("loading");
    setVideoErrorMessage("");

    try {
      // Stop previous stream if running
      if (isStreamRunning.current && previousStreamId.current && previousModel.current) {
        try {
          await getVideoFeedV2(selectedCamera.tin, false, previousStreamId.current, previousModel.current);
        } catch {
          console.warn("Failed to stop previous stream");
        }
      }

      // Start new stream with model_id
      const result = await getVideoFeedV2(selectedCamera.tin, true, selectedStreamId, selectedModel);

      if (result.data?.stream_url) {
        setVideoUrl(result.data.stream_url);
        setVideoStatus("success");
        isStreamRunning.current = true;
        previousStreamId.current = result.data.stream_id || selectedStreamId;
        previousModel.current = selectedModel;
      } else {
        // Capture error message from API response
        const errorMsg = result.data?.message || result.error || "Something went wrong while starting the stream.";
        setVideoErrorMessage(errorMsg);
        setVideoStatus("error");
        toast.error("Failed to start stream", { description: errorMsg });
      }
    } catch (error: unknown) {
      console.error("Stream error:", error);
      const errorMsg = error instanceof Error ? error.message : "Something went wrong while starting the stream.";
      setVideoErrorMessage(errorMsg);
      setVideoStatus("error");
    }
  }

  async function stopStream() {
    if (!selectedCamera || !previousStreamId.current || !previousModel.current) return;

    try {
      await getVideoFeedV2(selectedCamera.tin, false, previousStreamId.current, previousModel.current);
    } catch {
      console.warn("Failed to stop stream");
    } finally {
      isStreamRunning.current = false;
      setVideoUrl("");
      setVideoStatus("idle");
    }
  }

  // ===========================================
  // Analytics handlers
  // ===========================================

  function handleDateRangeChange(startDate: string, endDate: string) {
    setDateRange({ startDate, endDate });
  }

  const handleDatePickerChange = useCallback((value: Date[] | null) => {
    if (!value || value.length < 2) {
      setDateRange((prev) => {
        if (prev.startDate === "" && prev.endDate === "") return prev;
        return { startDate: "", endDate: "" };
      });
      return;
    }

    const nextStart = value[0].toISOString();
    const nextEnd = value[1].toISOString();

    setDateRange((prev) => {
      if (prev.startDate === nextStart && prev.endDate === nextEnd) return prev;
      return { startDate: nextStart, endDate: nextEnd };
    });
  }, []);

  function handleAnalyticsTypeChange(type: "zone" | "product") {
    setAnalyticsType(type);
    // Reset selection when switching types
    setSelectedZone({ id: null, name: null });
    setSelectedZoneData(null);
    setIsZoneDrawerOpen(false);
    fetchHeatmapData();
  }

  function handleZoneClick(zoneId: string, zoneName: string) {
    setSelectedZone({ id: zoneId, name: zoneName });

    if (analyticsType === "zone") {
      const zoneData = zoneHeatmapData.find((z) => String(z.zone_id) === zoneId);
      setSelectedZoneData(zoneData || null);
    } else {
      const productsForZone = productInteractionData.filter((p) => String(p.zone_id) === zoneId);
      setSelectedZoneData(productsForZone.length > 0 ? productsForZone : null);
    }

    setIsZoneDrawerOpen(true);
  }

  // ===========================================
  // EPD Bulk Update Handlers
  // ===========================================

  async function loadBulkDevices() {
    if (!selectedCategory || !selectedConfig) {
      toast.error("Please select category and config");
      return;
    }
    const requiresTemplate = templateDevicePrefixes.some((prefix) => selectedCategory.startsWith(prefix));
    if (requiresTemplate && !selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }

    setBulkLoading(true);
    try {
      const result = await retrieveDevicesForBulk(
        selectedCategory,
        selectedConfig,
        selectedTemplateId || undefined,
        selectedSiteId || undefined
      );
      if (result.data && result.columns) {
        setBulkDevices(result.data);
        setBulkColumns(result.columns);
        const nestedKey =
          result.data.find((device) => typeof (device as any).__nestedKey === "string")?.__nestedKey;
        setNestedObjectType(typeof nestedKey === "string" ? nestedKey : "");
        setHasUploadedCsv(false);
      }
    } finally {
      setBulkLoading(false);
    }
  }

  const toCsvValue = (value: any) => {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  };

  const normalizeColumnKey = (col: string) => col.toLowerCase().replace(/\s+/g, "_");

  const getCsvColumnLabel = (col: string) => {
    const normalized = normalizeColumnKey(col);
    if (normalized === "tin") return "Tin";
    if (normalized === "device_name") return "Device name";
    if (normalized === "location") return "Location";
    return col;
  };

  const getCsvRowValue = (row: BulkDeviceData, col: string) => {
    const normalized = normalizeColumnKey(col);
    if (normalized === "tin") {
      return row.tin ?? (row as any).Tin ?? (row as any).TIN ?? (row as any)["Tin"];
    }
    if (normalized === "device_name") {
      return (
        (row as any).device_name ??
        (row as any)["Device name"] ??
        (row as any)["Device Name"] ??
        (row as any).Device_Name ??
        (row as any).DeviceName
      );
    }
    if (normalized === "location") {
      return (row as any).location ?? (row as any).Location;
    }
    return (row as any)[col];
  };

  const getCsvColumns = () => {
    const baseColumns =
      bulkColumns.length > 0 ? bulkColumns : Object.keys(bulkDevices[0] || {});
    const priority = ["tin", "device_name", "location"];
    const normalizedLookup = new Map<string, string>();

    baseColumns.forEach((col) => {
      const normalized = normalizeColumnKey(col);
      if (!normalizedLookup.has(normalized)) {
        normalizedLookup.set(normalized, col);
      }
    });

    const ordered: string[] = [];
    priority.forEach((key) => {
      const column = normalizedLookup.get(key);
      if (column) ordered.push(column);
    });

    baseColumns.forEach((col) => {
      const normalized = normalizeColumnKey(col);
      if (!priority.includes(normalized)) {
        ordered.push(col);
      }
    });

    return ordered.filter((col) => !col.startsWith("__"));
  };

  const parseCsv = (text: string) => {
    const rows: string[][] = [];
    let current = "";
    let inQuotes = false;
    let row: string[] = [];

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === "," && !inQuotes) {
        row.push(current);
        current = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i += 1;
        }
        row.push(current);
        if (row.some((cell) => cell.trim() !== "")) {
          rows.push(row);
        }
        row = [];
        current = "";
        continue;
      }

      current += char;
    }

    row.push(current);
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }

    const [header, ...data] = rows;
    if (!header) return { columns: [], data: [] };

    const columns = header.map((col) => col.trim()).filter(Boolean);
    const parsedData = data.map((values) => {
      const record: Record<string, any> = {};
      columns.forEach((col, index) => {
        record[col] = values[index] ?? "";
      });
      return record;
    });

    return { columns, data: parsedData };
  };

  const handleDownloadCsv = () => {
    if (bulkDevices.length === 0 || bulkColumns.length === 0) {
      toast.error("No bulk data to download");
      return;
    }

    const csvColumns = getCsvColumns();
    const header = csvColumns.map(getCsvColumnLabel).join(",");
    const rows = bulkDevices.map((device) =>
      csvColumns.map((col) => toCsvValue(getCsvRowValue(device, col))).join(",")
    );
    const csvContent = [header, ...rows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const categoryName =
      deviceCategories.find((cat) => cat.id === selectedCategory)?.name || selectedCategory || "devices";
    const safeName = String(categoryName).replace(/[\\/:*?"<>|]+/g, "").trim() || "devices";
    link.download = `${safeName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadCsv = async (file: File) => {
    try {
      if (!nestedObjectType) {
        toast.error("Load devices before uploading a CSV");
        return;
      }

      const text = await file.text();
      const { columns, data } = parseCsv(text);

      if (columns.length === 0 || data.length === 0) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      const hasTin = columns.some((col) => col.toLowerCase() === "tin");
      if (!hasTin) {
        toast.error("CSV must include a tin column");
        return;
      }

      setBulkColumns(columns);
      setBulkDevices(data as BulkDeviceData[]);
      setHasUploadedCsv(true);
      toast.success("CSV loaded. Review changes and push updates.");
    } catch (error) {
      console.error("CSV upload failed:", error);
      toast.error("Failed to load CSV");
    }
  };

  const buildBulkUpdatePayload = (rows: BulkDeviceData[]): Array<Record<string, any>> => {
    if (!nestedObjectType) return rows;

    return rows
      .map((row) => {
        const tinValue =
          row.tin ??
          (row as any).Tin ??
          (row as any).TIN ??
          (row as any)["Tin"];

        if (!tinValue) return null;

        const rest: Record<string, any> = { ...row };
        delete (rest as any).tin;
        delete (rest as any).Tin;
        delete (rest as any).TIN;
        delete (rest as any)["Tin"];
        delete (rest as any).device_name;
        delete (rest as any)["Device name"];
        delete (rest as any)["Device Name"];
        delete (rest as any).Device_Name;
        delete (rest as any).DeviceName;
        delete (rest as any).location;
        delete (rest as any).Location;

        Object.keys(rest).forEach((key) => {
          if (key.startsWith("__")) delete rest[key];
        });

        return {
          tin: tinValue,
          data: {
            [nestedObjectType]: rest,
          },
        };
      })
      .filter(Boolean) as Array<Record<string, any>>;
  };

  async function pushAllUpdates() {
    if (bulkDevices.length === 0) {
      toast.error("No devices to update");
      return;
    }

    setBulkLoading(true);
    try {
      const payload = buildBulkUpdatePayload(bulkDevices);
      const result = await pushBulkUpdate(selectedConfig, payload);
      if (result.success) {
        toast.success("Bulk update successful");
        setHasUploadedCsv(false);
      }
    } finally {
      setBulkLoading(false);
    }
  }

  // ===========================================
  // Render: Video Intro
  // ===========================================

  function renderVideoIntro() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="relative w-full max-w-5xl mx-8">
          <div className="relative aspect-video rounded-2xl overflow-hidden" style={{ backgroundColor: colors.backgroundCard, border: `2px solid ${accent}30` }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center relative" style={{ backgroundColor: `${accent}20` }}>
                  <svg viewBox="0 0 24 24" fill={accent} className="w-16 h-16">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: accent }} />
                </div>
                <h2 className="text-4xl font-bold mb-4" style={{ color: accent }}>Retail Simulation</h2>
                <p className="text-xl mb-2" style={{ color: colors.text }}>Smart Store Management</p>
                <p className="max-w-2xl mx-auto" style={{ color: colors.textMuted }}>
                  Experience real-time video streaming with model selection and EPD bulk updates.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowVideo(false)}
            className="absolute bottom-6 right-6 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 flex items-center gap-3 group"
            style={{ backgroundColor: accent, color: colors.background }}
          >
            <span>Enter</span>
            <svg className="w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ===========================================
  // Render: Stream Tab
  // ===========================================

  function renderStreamTab() {
    return (
      <div className="space-y-6">
        {/* Camera Selection */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
          <h3 className="text-xl font-bold mb-4" style={{ color: colors.text }}>📹 Camera Streams</h3>

          {camerasLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: `${accent} transparent transparent` }} />
            </div>
          ) : cameras.length === 0 ? (
            <div className="text-center py-12" style={{ color: colors.textMuted }}>
              <p>No cameras found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cameras.map((camera) => (
                <button
                  key={camera.tin}
                  onClick={() => handleCameraSelect(camera)}
                  className="p-5 rounded-xl text-left transition-all hover:scale-[1.02] group"
                  style={{
                    backgroundColor: selectedCamera?.tin === camera.tin ? `${accent}15` : colors.background,
                    border: `2px solid ${selectedCamera?.tin === camera.tin ? accent : colors.border}`,
                    boxShadow: selectedCamera?.tin === camera.tin ? `0 0 20px ${accent}30` : "none",
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-bold text-lg" style={{ color: colors.text }}>{camera.device_name}</p>
                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
                  </div>
                  <p className="text-sm font-mono" style={{ color: colors.textMuted }}>TIN: {camera.tin}</p>
                  <p className="text-sm" style={{ color: colors.textMuted }}>{camera.location || "No location"}</p>
                  <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                    <svg className="w-4 h-4" fill={accent} viewBox="0 0 24 24">
                      <path d="M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4V7c0-.55-.45-1-1-1z" />
                    </svg>
                    <span className="text-sm font-semibold" style={{ color: accent }}>{camera.streams.length} stream(s) available</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stream & Model Selection */}
        {selectedCamera && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
                <svg className="w-5 h-5" fill={accent} viewBox="0 0 24 24">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: colors.text }}>Stream Configuration</h3>
                <p className="text-sm" style={{ color: colors.textMuted }}>Configure {selectedCamera.device_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <CustomDropdown
                label="Select Stream"
                value={selectedStreamId}
                options={streamOptions}
                onChange={handleStreamSelect}
                placeholder="Choose a stream..."
              />

              <CustomDropdown
                label="Select Model"
                value={selectedModel}
                options={modelOptions}
                onChange={handleModelSelect}
                placeholder="Choose a model..."
                disabled={!selectedStreamId}
              />

              <div className="flex flex-col">
                <label className="block text-sm mb-2 font-medium" style={{ color: colors.textMuted }}>Actions</label>
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={startStream}
                    disabled={!selectedStreamId || !selectedModel || videoStatus === "loading"}
                    className="flex-1 px-4 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: accent, color: colors.background }}
                  >
                    {videoStatus === "loading" ? (
                      <>
                        <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `${colors.background} transparent transparent` }} />
                        <span>Starting...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>Start</span>
                      </>
                    )}
                  </button>
                  {videoStatus === "success" && (
                    <button
                      onClick={stopStream}
                      className="px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:opacity-90"
                      style={{ backgroundColor: "#ef4444", color: "#fff" }}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h12v12H6z" />
                      </svg>
                      <span>Stop</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Video Display */}
            <div className="w-full rounded-xl overflow-hidden" style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, minHeight: "400px" }}>
              {videoStatus === "idle" && (
                <div className="flex items-center justify-center h-96" style={{ color: colors.textMuted }}>
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${colors.border}50` }}>
                      <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium mb-2">No Active Stream</p>
                    <p className="text-sm">Select a stream and model, then click Start</p>
                  </div>
                </div>
              )}

              {videoStatus === "loading" && (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
                      <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: `${accent} transparent transparent` }} />
                    </div>
                    <p className="text-lg font-medium" style={{ color: colors.text }}>Starting Live Stream...</p>
                    <p className="text-sm" style={{ color: colors.textMuted }}>Connecting to {selectedCamera.device_name}</p>
                  </div>
                </div>
              )}

              {videoStatus === "success" && videoUrl && (
                <iframe
                  src={videoUrl}
                  className="w-full h-[500px]"
                  allow="autoplay"
                  frameBorder={0}
                  allowFullScreen
                />
              )}

              {videoStatus === "error" && (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center max-w-md">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fef3c720" }}>
                      <svg className="w-6 h-6" fill="#f59e0b" viewBox="0 0 24 24">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                      </svg>
                    </div>
                    <p className="text-base font-medium mb-2" style={{ color: "#f59e0b" }}>
                      Something went wrong while starting the stream.
                    </p>
                    {videoErrorMessage && (
                      <p className="text-sm mb-4 px-4" style={{ color: colors.textMuted }}>
                        {videoErrorMessage}
                      </p>
                    )}
                    <button
                      onClick={startStream}
                      className="px-6 py-2 rounded-lg font-semibold border transition-all hover:opacity-80"
                      style={{ borderColor: accent, color: accent, backgroundColor: "transparent" }}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>

            {videoUrl && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => window.open(videoUrl, "_blank")}
                  className="px-5 py-2 rounded-xl flex items-center gap-2 font-medium transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in new tab
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ===========================================
  // Render: EPD Tab
  // ===========================================

  function renderEPDTab() {
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
              <CustomDropdown
                label="Device Category"
                value={selectedCategory}
                options={categoryOptions}
                onChange={(value) => {
                  setSelectedCategory(value);
                  setSelectedConfig("");
                  setSelectedTemplateId("");
                  setBulkDevices([]);
                  setBulkColumns([]);
                  setNestedObjectType("");
                  setHasUploadedCsv(false);
                }}
                placeholder="Choose category..."
              />

              <CustomDropdown
                label="Device Config"
                value={selectedConfig}
                options={configOptions}
                onChange={setSelectedConfig}
                placeholder="Choose config..."
                disabled={!selectedCategory}
              />

              {requiresTemplate && (
                <CustomDropdown
                  label="Template"
                  value={selectedTemplateId}
                  options={templateOptions}
                  onChange={setSelectedTemplateId}
                  placeholder="Choose template..."
                  disabled={!selectedCategory}
                />
              )}

              <button
                onClick={loadBulkDevices}
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
                    handleUploadCsv(file);
                    event.target.value = "";
                  }
                }}
              />
              {bulkDevices.length > 0 && (
                <button
                  onClick={handleDownloadCsv}
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
                  onClick={pushAllUpdates}
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

  // ===========================================
  // Render: Analytics Tab
  // ===========================================

  function renderAnalyticsTab() {
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
              onClick={() => handleAnalyticsTypeChange("zone")}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                backgroundColor: analyticsType === "zone" ? accent : "transparent",
                color: analyticsType === "zone" ? colors.background : colors.textMuted,
              }}
            >
               Retail Analytics
            </button>
            <button
              onClick={() => handleAnalyticsTypeChange("product")}
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
            onChange={handleDatePickerChange}
            onSubmit={fetchHeatmapData}
            accentColor={accent}
          />
          <p className="text-xs" style={{ color: colors.textMuted }}>
            Pick a date-time range and click Apply to refresh heatmaps.
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
                                  onClick={() => handleZoneClick(String(item.zone_id), (item as ZoneHeatmapData).zone_name || `Zone ${item.zone_id}`)}
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
                                    handleZoneClick(
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
              <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setIsZoneDrawerOpen(false)}>
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
                        onClick={() => setIsZoneDrawerOpen(false)}
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

  // ===========================================
  // Main Render
  // ===========================================

  return (
    <div className="min-h-screen text-white relative" style={{ backgroundColor: colors.background }}>
      <Toaster position="top-right" richColors />

      {showVideo && renderVideoIntro()}

      <div className={showVideo ? "opacity-0" : "opacity-100 transition-opacity duration-500"}>
        {/* Header */}
        <header className="sticky top-0 z-40 px-8 py-4" style={{ backgroundColor: `${colors.background}ee`, backdropFilter: "blur(10px)" }}>
          <div className="flex items-center justify-between">
            <Link href="/experiences" className="inline-flex items-center gap-2 text-sm transition-colors duration-300 group" style={{ color: colors.textMuted }}>
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="group-hover:text-white">Back</span>
            </Link>

            <h1 className="text-xl font-bold" style={{ color: accent }}>Retail Simulation</h1>

            <div className="w-20" />
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="px-8 py-4">
          <AppTabs
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as ActiveTab)}
            accentColor={accent}
          />
        </div>

        {/* Content */}
        <main className="px-8 py-6">
          {activeTab === "stream" && renderStreamTab()}
          {activeTab === "epd" && renderEPDTab()}
          {activeTab === "analytics" && renderAnalyticsTab()}
        </main>
      </div>
    </div>
  );
}
