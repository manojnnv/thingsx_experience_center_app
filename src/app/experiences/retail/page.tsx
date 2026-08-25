"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { colors } from "@/config/theme";
import { toast } from "sonner";
import ThemedToaster from "@/app/component/app-toaster/ThemedToaster";
import { useAuth } from "@/app/providers/AuthProvider";
import { getCameras, getVideoFeedV2, CameraStream, ModelConfig } from "@/app/services/realtime/realtime";
import {
  RetailHeader,
  RetailStreamTab,
} from "@/app/component/app-retail";
import type { DropdownOption } from "@/app/component/app-retail/types";
import { useExperienceState } from "@/hooks/useExperienceState";
import VideoLibraryButton from "@/app/component/app-video-library/VideoLibraryButton";
import { getLayout } from "@/lib/layout";
import { ExperienceErrorBoundary } from "@/app/component/ExperienceErrorBoundary";

const RetailHeatmapView = dynamic(
  () => import("@/app/component/app-retail/RetailAnalyticsTab").then((m) => ({ default: m.RetailHeatmapView })),
  { ssr: false }
);

// ===========================================
// Page Accent Color
// ===========================================

const accent = colors.retailAccent;

// ===========================================
// Tab Configuration
// ===========================================

const TABS = {
  stream: "Video Streams",
  analytics: "Retail Analytics",
  productInteraction: "Product Interaction",
} as const;

const TABS_ARRAY = Object.values(TABS);

// ===========================================
// Main Component (uses useSearchParams via useQueryParams — must be inside Suspense)
// ===========================================

function RetailExperienceContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Page state with persistence
  const { isReady, activeTab, setActiveTab } = useExperienceState({
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

  // Stream refs for cleanup
  const previousStreamId = useRef<string | null>(null);
  const previousModel = useRef<string | null>(null);
  const isStreamRunning = useRef(false);
  const pendingStreamConfig = useRef<{ cameraName: string } | null>(null);
  const [heatmapVisited, setHeatmapVisited] = useState(false);

  const heatmapVisible =
    activeTab === TABS.analytics || activeTab === TABS.productInteraction;
  const heatmapMode = activeTab === TABS.productInteraction ? "product" : "zone";

  useEffect(() => {
    void getLayout();
    void import("@/app/component/app-retail/RetailAnalyticsTab");
  }, []);

  useEffect(() => {
    if (heatmapVisible) setHeatmapVisited(true);
  }, [heatmapVisible]);

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
    if (!isAuthenticated || authLoading) return;

    async function loadCameras() {
      setCamerasLoading(true);
      try {
        const result = await getCameras();
          if (result.data) {
          setCameras(result.data);
          if (process.env.NODE_ENV === "development") {
            console.log("Loaded cameras:", result.data);
          }
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
  }, [isAuthenticated, authLoading, activeTab]);

  // ===========================================
  // Auto-select camera + product interaction stream/model
  // ===========================================

  function autoSelectProductStream(cam: CameraStream) {
    setSelectedCamera(cam);
    setVideoUrl("");
    setVideoStatus("idle");

    const stream = cam.streams.find((s) =>
      s.models.some((m) => m.model_name.toLowerCase().includes("product"))
    );
    if (stream) {
      setSelectedStreamId(stream.stream_id);
      const model = stream.models.find((m) =>
        m.model_name.toLowerCase().includes("product")
      );
      setSelectedModel(model ? String(model.model_id) : "");
    } else {
      setSelectedStreamId("");
      setSelectedModel("");
    }
  }

  function handleViewStream(cameraName: string) {
    const cam = cameras.find((c) => c.device_name === cameraName);
    if (cam) {
      autoSelectProductStream(cam);
    } else {
      pendingStreamConfig.current = { cameraName };
    }
    setActiveTab(TABS.stream);
  }

  useEffect(() => {
    if (cameras.length > 0 && pendingStreamConfig.current) {
      const cam = cameras.find(
        (c) => c.device_name === pendingStreamConfig.current!.cameraName
      );
      if (cam) {
        autoSelectProductStream(cam);
      }
      pendingStreamConfig.current = null;
    }
  }, [cameras]);

  // ===========================================
  // Stream Handlers
  // ===========================================

  function handleCameraSelect(camera: CameraStream | null) {
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
  // Render: Stream Tab (handled by RetailStreamTab component)
  // ===========================================

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

      <div className="flex flex-col h-screen">
        <RetailHeader
          accent={accent}
          tabs={TABS_ARRAY}
          defaultTab={TABS.stream}
          onTabChange={(tab) => setActiveTab(tab)}
          accentColor={accent}
          activeTab={activeTab}
        />

        {/* Content */}
        <main className="px-8 py-2 flex-1 min-h-0 relative">
          <div className={activeTab === TABS.stream ? "h-full" : "hidden"}>
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
              onViewAnalytics={() => setActiveTab(TABS.productInteraction)}
            />
          </div>
          {(heatmapVisited || heatmapVisible) && (
            <div
              className={
                heatmapVisible
                  ? "h-full"
                  : "invisible pointer-events-none absolute inset-0"
              }
            >
              <RetailHeatmapView
                mode={heatmapMode}
                accent={accent}
                onViewStream={handleViewStream}
                visible={heatmapVisible}
              />
            </div>
          )}
        </main>
      </div>
      <VideoLibraryButton />
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
    <ExperienceErrorBoundary>
      <Suspense fallback={<RetailPageFallback />}>
        <RetailExperienceContent />
      </Suspense>
    </ExperienceErrorBoundary>
  );
}
