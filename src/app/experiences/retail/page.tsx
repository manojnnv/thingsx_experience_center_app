"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { colors } from "@/config/theme";
import { Toaster, toast } from "sonner";
import { useAuth } from "@/app/providers/AuthProvider";
import { AppTabs, TabItem } from "@/components/AppTabs";
import { getCameras, getVideoFeedV2, CameraStream, StreamConfig, ModelConfig } from "@/app/services/realtime/realtime";
import {
  getDeviceCategories,
  getDeviceConfigOptions,
  retrieveDevicesForBulk,
  pushBulkUpdate,
  updateDeviceConfig,
  DeviceCategory,
  DeviceConfigOption,
  BulkDeviceData,
} from "@/app/services/bulkUpload/bulkUpload";

// ===========================================
// Page Accent Color
// ===========================================

const accent = colors.retailAccent;

// ===========================================
// Types
// ===========================================

type ActiveTab = "stream" | "epd";

interface DropdownOption {
  value: string;
  label: string;
}

// ===========================================
// Tab Configuration
// ===========================================

const TABS: TabItem[] = [
  { id: "stream", label: "Video Streams", icon: "📹" },
  { id: "epd", label: "EPD Bulk Update", icon: "🏷️" },
];

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
  const [bulkDevices, setBulkDevices] = useState<BulkDeviceData[]>([]);
  const [bulkColumns, setBulkColumns] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

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
      const result = await getDeviceCategories();
      if (result.data) {
        setDeviceCategories(result.data);
      }
    }

    if (activeTab === "epd") {
      loadCategories();
    }
  }, [isAuthenticated, authLoading, showVideo, activeTab]);

  // ===========================================
  // Load Config Options when Category Changes
  // ===========================================

  useEffect(() => {
    if (!selectedCategory) {
      setDeviceConfigOptions([]);
      return;
    }

    async function loadConfigOptions() {
      const result = await getDeviceConfigOptions(selectedCategory);
      if (result.data) {
        setDeviceConfigOptions(result.data);
      }
    }

    loadConfigOptions();
  }, [selectedCategory]);

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
  // EPD Bulk Update Handlers
  // ===========================================

  async function loadBulkDevices() {
    if (!selectedCategory || !selectedConfig) {
      toast.error("Please select category and config");
      return;
    }

    setBulkLoading(true);
    try {
      const result = await retrieveDevicesForBulk(selectedCategory, selectedConfig);
      if (result.data && result.columns) {
        setBulkDevices(result.data);
        setBulkColumns(result.columns);
      }
    } finally {
      setBulkLoading(false);
    }
  }

  function startEditing(device: BulkDeviceData) {
    setEditingDevice(device.tin);
    setEditValues({ ...device });
  }

  function cancelEditing() {
    setEditingDevice(null);
    setEditValues({});
  }

  async function saveDeviceEdit(tin: string) {
    try {
      const updateData: Record<string, any> = {};
      Object.keys(editValues).forEach((key) => {
        if (key !== "tin" && key !== "device_name") {
          updateData[key] = editValues[key];
        }
      });

      const result = await updateDeviceConfig(tin, updateData);
      if (result.success) {
        setBulkDevices((prev) =>
          prev.map((d) => (d.tin === tin ? { ...d, ...editValues } : d))
        );
        setEditingDevice(null);
        setEditValues({});
      }
    } catch (error) {
      toast.error("Failed to update device");
    }
  }

  async function pushAllUpdates() {
    if (bulkDevices.length === 0) {
      toast.error("No devices to update");
      return;
    }

    setBulkLoading(true);
    try {
      const result = await pushBulkUpdate(selectedConfig, bulkDevices);
      if (result.success) {
        toast.success("Bulk update successful");
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

    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
              <svg className="w-5 h-5" fill={accent} viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold" style={{ color: colors.text }}>EPD Bulk Update</h3>
              <p className="text-sm" style={{ color: colors.textMuted }}>Select device category and configuration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CustomDropdown
              label="Device Category"
              value={selectedCategory}
              options={categoryOptions}
              onChange={(value) => {
                setSelectedCategory(value);
                setSelectedConfig("");
                setBulkDevices([]);
                setBulkColumns([]);
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

            <div className="flex flex-col">
              <label className="block text-sm mb-2 font-medium" style={{ color: colors.textMuted }}>Actions</label>
              <button
                onClick={loadBulkDevices}
                disabled={!selectedCategory || !selectedConfig || bulkLoading}
                className="w-full px-4 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
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
                    <span>Load Devices</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {bulkDevices.length > 0 && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
                  <span className="text-lg font-bold" style={{ color: accent }}>{bulkDevices.length}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: colors.text }}>Devices</h3>
                  <p className="text-sm" style={{ color: colors.textMuted }}>Edit individual devices or push bulk update</p>
                </div>
              </div>
              <button
                onClick={pushAllUpdates}
                disabled={bulkLoading}
                className="px-6 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: accent, color: colors.background }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                {bulkLoading ? "Updating..." : "Push All Updates"}
              </button>
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
                    <th className="text-right py-4 px-4 text-sm font-bold" style={{ color: colors.text }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkDevices.map((device, idx) => (
                    <tr
                      key={device.tin}
                      style={{
                        borderBottom: idx < bulkDevices.length - 1 ? `1px solid ${colors.border}` : "none",
                        backgroundColor: editingDevice === device.tin ? `${accent}05` : "transparent",
                      }}
                    >
                      {bulkColumns.map((col) => (
                        <td key={col} className="py-4 px-4">
                          {editingDevice === device.tin && col !== "tin" && col !== "device_name" ? (
                            col === "led_color" ? (
                              <input
                                type="color"
                                value={editValues[col] || "#ffffff"}
                                onChange={(e) => setEditValues({ ...editValues, [col]: e.target.value })}
                                className="w-12 h-10 rounded-lg cursor-pointer border-2"
                                style={{ borderColor: colors.border }}
                              />
                            ) : (
                              <input
                                type="text"
                                value={editValues[col] || ""}
                                onChange={(e) => setEditValues({ ...editValues, [col]: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg outline-none text-sm font-medium"
                                style={{ backgroundColor: colors.background, border: `2px solid ${accent}`, color: colors.text }}
                              />
                            )
                          ) : col === "led_color" ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg border-2" style={{ backgroundColor: String(device[col]) || "#fff", borderColor: colors.border }} />
                              <span className="text-sm font-mono" style={{ color: colors.text }}>{String(device[col] || "")}</span>
                            </div>
                          ) : (
                            <span className="text-sm" style={{ color: colors.text }}>{String(device[col] ?? "")}</span>
                          )}
                        </td>
                      ))}
                      <td className="py-4 px-4 text-right">
                        {editingDevice === device.tin ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => saveDeviceEdit(device.tin)}
                              className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"
                              style={{ backgroundColor: accent, color: colors.background }}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-4 py-2 rounded-lg text-sm font-semibold"
                              style={{ backgroundColor: colors.border, color: colors.text }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(device)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1 transition-all hover:scale-[1.02]"
                            style={{ backgroundColor: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                        )}
                      </td>
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
        </main>
      </div>
    </div>
  );
}
