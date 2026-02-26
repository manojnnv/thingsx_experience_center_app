"use client";

import React from "react";
import { colors } from "@/config/theme";
import RetailCustomDropdown from "./RetailCustomDropdown";
import type { DropdownOption } from "./types";
import type { CameraStream } from "@/app/services/realtime/realtime";

function RetailStreamTab({
  accent,
  camerasLoading,
  cameras,
  selectedCamera,
  selectedStreamId,
  selectedModel,
  streamOptions,
  modelOptions,
  onCameraSelect,
  onStreamSelect,
  onModelSelect,
  onStartStream,
  onStopStream,
  videoStatus,
  videoUrl,
  videoErrorMessage,
  onOpenVideo,
  onViewAnalytics,
}: {
  accent: string;
  camerasLoading: boolean;
  cameras: CameraStream[];
  selectedCamera: CameraStream | null;
  selectedStreamId: string;
  selectedModel: string;
  streamOptions: DropdownOption[];
  modelOptions: DropdownOption[];
  onCameraSelect: (camera: CameraStream | null) => void;
  onStreamSelect: (streamId: string) => void;
  onModelSelect: (model: string) => void;
  onStartStream: () => void;
  onStopStream: () => void;
  videoStatus: "idle" | "loading" | "success" | "error";
  videoUrl: string;
  videoErrorMessage: string;
  onOpenVideo: () => void;
  onViewAnalytics?: () => void;
}) {
  if (!selectedCamera) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div
          className="flex-1 min-h-0 rounded-2xl p-5 flex flex-col"
          style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}
        >
          <h3 className="text-lg font-bold mb-4 flex-none" style={{ color: colors.text }}>
            Camera Streams
          </h3>

          {camerasLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: `${accent} transparent transparent` }} />
            </div>
          ) : cameras.length === 0 ? (
            <div className="flex-1 flex items-center justify-center" style={{ color: colors.textMuted }}>
              <p>No cameras found</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cameras.map((camera) => (
                  <button
                    key={camera.tin}
                    onClick={() => onCameraSelect(camera)}
                    className="p-5 rounded-xl text-left transition-all hover:scale-[1.02] group"
                    style={{
                      backgroundColor: colors.background,
                      border: `2px solid ${colors.border}`,
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
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedModelName = selectedModel
    ? selectedCamera.streams
        .flatMap((s) => s.models)
        .find((m) => String(m.model_id) === selectedModel)?.model_name
    : undefined;

  const isProductInteractionModel =
    !!selectedModelName && selectedModelName.toLowerCase().includes("product");

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3">
      {/* Stream Configuration Header + Controls */}
      <div className="flex-none rounded-2xl p-4" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
              <svg className="w-4 h-4" fill={accent} viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: colors.text }}>
                Stream Configuration
              </h3>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                {selectedCamera.device_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isProductInteractionModel && onViewAnalytics && (
              <button
                onClick={onViewAnalytics}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 flex items-center gap-1.5"
                style={{ backgroundColor: accent, color: colors.background }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Analytics
              </button>
            )}
            <button
              onClick={() => onCameraSelect(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}
            >
              Change Camera
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RetailCustomDropdown
            label="Select Stream"
            value={selectedStreamId}
            options={streamOptions}
            onChange={onStreamSelect}
            placeholder="Choose a stream..."
            accent={accent}
          />

          <RetailCustomDropdown
            label="Select Model"
            value={selectedModel}
            options={modelOptions}
            onChange={onModelSelect}
            placeholder="Choose a model..."
            disabled={!selectedStreamId}
            accent={accent}
          />

          <div className="flex flex-col">
            <label className="block text-sm mb-2 font-medium" style={{ color: colors.textMuted }}>Actions</label>
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={onStartStream}
                disabled={!selectedStreamId || !selectedModel || videoStatus === "loading"}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  onClick={onStopStream}
                  className="px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all hover:opacity-90"
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
      </div>

      {/* Video Display — fills remaining space */}
      <div
        className="flex-1 min-h-0 rounded-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
      >
        {videoStatus === "idle" && (
          <div className="flex-1 flex items-center justify-center" style={{ color: colors.textMuted }}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${colors.border}50` }}>
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                </svg>
              </div>
              <p className="text-base font-medium mb-1">No Active Stream</p>
              <p className="text-sm">Select a stream and model, then click Start</p>
            </div>
          </div>
        )}

        {videoStatus === "loading" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 border-4 rounded-full animate-spin" style={{ borderColor: `${accent} transparent transparent` }} />
              <p className="text-base font-medium" style={{ color: colors.text }}>Starting stream...</p>
              <p className="text-sm" style={{ color: colors.textMuted }}>Please wait</p>
            </div>
          </div>
        )}

        {videoStatus === "success" && videoUrl && (
          <iframe
            src={videoUrl}
            title="Camera Stream"
            className="w-full flex-1"
            allow="autoplay; fullscreen"
          />
        )}

        {videoStatus === "error" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
                <svg className="w-6 h-6" fill="#ef4444" viewBox="0 0 24 24">
                  <path d="M12 2L2 22h20L12 2zm0 4.5l6.5 12H5.5L12 6.5zm0 4.5v4h1.5v-4H12zm0 5.5v1.5h1.5V16H12z" />
                </svg>
              </div>
              <p className="text-base font-medium mb-1" style={{ color: colors.text }}>Stream Error</p>
              <p className="text-sm mb-3" style={{ color: colors.textMuted }}>{videoErrorMessage || "Failed to load stream. Please try again."}</p>
              <button
                onClick={onStartStream}
                className="px-6 py-2 rounded-lg font-semibold border transition-all hover:opacity-80"
                style={{ borderColor: accent, color: accent, backgroundColor: "transparent" }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {videoUrl && videoStatus === "success" && (
          <div className="flex-none p-2 flex justify-end" style={{ borderTop: `1px solid ${colors.border}` }}>
            <button
              onClick={onOpenVideo}
              className="px-4 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ backgroundColor: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in new tab
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RetailStreamTab;
