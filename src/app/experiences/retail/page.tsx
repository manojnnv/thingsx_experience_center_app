"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { colors } from "@/config/theme";
import { toast } from "sonner";
import ThemedToaster from "@/app/component/app-toaster/ThemedToaster";
import { useAuth } from "@/app/providers/AuthProvider";
import { getCameras, getVideoFeedV2, CameraStream, StreamConfig, ModelConfig } from "@/app/services/realtime/realtime";
import { updateEPDValue } from "@/app/services/epd/epd";
import { getLayout } from "@/lib/layout";
import VideoIntro from "@/app/component/app-experience/VideoIntro";
import {
  RetailHeader,
  RetailStreamTab,
  RetailAnalyticsTab,
  RetailCustomDropdown,
} from "@/app/component/app-retail";
import type { DropdownOption } from "@/app/component/app-retail/types";
import SensorsEpdControl from "@/app/component/app-experience/SensorsEpdControl";
import type { EPDConfig } from "@/config/devices";
import { epdColorMap, retailESLDevices } from "@/config/devices";
import type { EPDFieldValues } from "@/app/component/app-experience/types";
import { useQueryParams } from "@/hooks/useQueryParams";
import { useExperienceState } from "@/hooks/useExperienceState";

// ===========================================
// Page Accent Color
// ===========================================

const accent = colors.retailAccent;
const CustomDropdown = RetailCustomDropdown;

// ===========================================
// Tab Configuration
// ===========================================

const TABS = {
  stream: "Video Streams",
  epd: "EPD Control",
  analytics: "Analytics",
} as const;

const TABS_ARRAY = Object.values(TABS);

// ===========================================
// Main Component (uses useSearchParams via useQueryParams — must be inside Suspense)
// ===========================================

function RetailExperienceContent() {
  const { getParam } = useQueryParams();
  // Auth state
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Page state with persistence
  const { isReady, showVideo, skipVideo, activeTab, setActiveTab } = useExperienceState({
    pageKey: "retail",
    tabs: TABS_ARRAY,
    defaultTab: TABS.stream,
  });

  // Stream state
  const [cameras, setCameras] = useState<CameraStream[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraStream | null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoStatus, setVideoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [videoErrorMessage, setVideoErrorMessage] = useState<string>("");
  const [camerasLoading, setCamerasLoading] = useState(false);

  // Retail EPD control state
  const [retailEpdValues, setRetailEpdValues] = useState<EPDFieldValues>({});
  const [retailEpdUpdating, setRetailEpdUpdating] = useState(false);

  // Stream refs for cleanup
  const previousStreamId = useRef<string | null>(null);
  const previousModel = useRef<string | null>(null);
  const isStreamRunning = useRef(false);

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

    if (activeTab === TABS.stream) {
      loadCameras();
    }
  }, [isAuthenticated, authLoading, showVideo, activeTab]);

  // ===========================================
  // Retail EPD Control (ESL)
  // ===========================================

  const retailTinFilter = useMemo(() => {
    const param = getParam("epd_tins");
    if (!param) return null;
    return param.split(",").map((tin) => tin.trim()).filter(Boolean);
  }, [getParam]);

  const retailEpdDevices = useMemo<EPDConfig[]>(() => {
    const devices = retailTinFilter
      ? retailESLDevices.filter((device) => retailTinFilter.includes(device.tin))
      : retailESLDevices;
    return devices.map((device) => ({
      tin: device.tin,
      displayName: device.displayName,
      size: device.size,
      color: device.color,
      width: device.width,
      height: device.height,
      fields: device.productFields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type === "price" ? "price" : "text",
        defaultValue: field.defaultValue,
      })),
    }));
  }, [retailTinFilter]);

  useEffect(() => {
    const initialValues: EPDFieldValues = {};
    retailEpdDevices.forEach((epd) => {
      initialValues[epd.tin] = {};
      epd.fields.forEach((field) => {
        initialValues[epd.tin][field.key] = field.defaultValue ?? "";
      });
    });
    setRetailEpdValues(initialValues);
  }, [retailEpdDevices]);

  const handleRetailEpdFieldChange = useCallback(
    (tin: string, fieldKey: string, value: string | number) => {
      setRetailEpdValues((prev) => ({
        ...prev,
        [tin]: { ...prev[tin], [fieldKey]: value },
      }));
    },
    []
  );

  const handleUpdateSingleRetailEpd = useCallback(
    async (epd: EPDConfig) => {
      setRetailEpdUpdating(true);
      try {
        const values = retailEpdValues[epd.tin] || {};
        await updateEPDValue(epd.tin, values);
      } finally {
        setRetailEpdUpdating(false);
      }
    },
    [retailEpdValues]
  );

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
  // Render: Video Intro
  // ===========================================



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
                accent={accent}
              />

              <CustomDropdown
                label="Select Model"
                value={selectedModel}
                options={modelOptions}
                onChange={handleModelSelect}
                placeholder="Choose a model..."
                disabled={!selectedStreamId}
                accent={accent}
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
  // Render: Analytics Tab
  // ===========================================

  function renderAnalyticsTab() {
    return <RetailAnalyticsTab accent={accent} />;
  }
  // ===========================================
  // Main Render
  // ===========================================

  // Show minimal loading state until localStorage check is complete
  if (!isReady) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: colors.background }}
      />
    );
  }

  return (
    <div
      className="min-h-screen text-white relative"
      style={{ backgroundColor: colors.background }}
    >
      <ThemedToaster accentColor={colors.retailAccent} />

      <VideoIntro
        show={showVideo}
        onSkip={skipVideo}
        title="Retail Simulation"
        subtitle="Experience real-time video streaming with model selection and EPD control."
        buttonLabel="Skip Intro"
        accentColor={accent}
      />

      <div className={showVideo ? "opacity-0" : "opacity-100 transition-opacity duration-500"}>
        <RetailHeader
          accent={accent}
          tabs={TABS_ARRAY}
          defaultTab={TABS.stream}
          onTabChange={(tab) => setActiveTab(tab)}
          accentColor={accent}
          activeTab={activeTab}
        />

        {/* Content */}
        <main className="px-8 py-6">
          {activeTab === TABS.stream && (
            <RetailStreamTab
              accent={accent}
              camerasLoading={camerasLoading}
              cameras={cameras}
              selectedCamera={selectedCamera}
              selectedStreamId={selectedStreamId}
              selectedModel={selectedModel}
              streamOptions={streamOptions}
              modelOptions={modelOptions}
              onCameraSelect={handleCameraSelect}
              onStreamSelect={handleStreamSelect}
              onModelSelect={handleModelSelect}
              onStartStream={startStream}
              onStopStream={stopStream}
              videoStatus={videoStatus}
              videoUrl={videoUrl}
              videoErrorMessage={videoErrorMessage}
              onOpenVideo={() => window.open(videoUrl, "_blank")}
            />
          )}
          {activeTab === TABS.epd && (
            <SensorsEpdControl
              sensorEPDDevices={retailEpdDevices}
              epdColorMap={epdColorMap}
              epdValues={retailEpdValues}
              updating={retailEpdUpdating}
              onEPDFieldChange={handleRetailEpdFieldChange}
              onUpdateSingleEPD={handleUpdateSingleRetailEpd}
              accentColor={accent}
            />
          )}
          {activeTab === TABS.analytics && (
            <RetailAnalyticsTab accent={accent} />
          )}
        </main>
      </div>
    </div>
  );
}

// Fallback shown during prerender / while search params are not yet available
function RetailPageFallback() {
  return (
    <div
      className="min-h-screen text-white relative flex items-center justify-center"
      style={{ backgroundColor: colors.background }}
    >
      <span style={{ color: colors.textMuted }}>Loading...</span>
    </div>
  );
}

export default function RetailExperiencePage() {
  return (
    <Suspense fallback={<RetailPageFallback />}>
      <RetailExperienceContent />
    </Suspense>
  );
}
