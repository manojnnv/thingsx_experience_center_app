"use client";

import React, { useRef, useEffect } from "react";
import { X, ArrowLeft, Play } from "lucide-react";
import { colors } from "@/config/theme";
import { VIDEO_LIBRARY, type VideoEntry } from "@/config/videos";

interface VideoLibraryModalProps {
  open: boolean;
  onClose: () => void;
}

export default function VideoLibraryModal({ open, onClose }: VideoLibraryModalProps) {
  const [selected, setSelected] = React.useState<VideoEntry | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) {
      setSelected(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selected) setSelected(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, selected, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (selected) setSelected(null);
          else onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-3xl mx-6 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          backgroundColor: colors.backgroundCard,
          border: `1px solid ${colors.border}`,
          maxHeight: "85vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-none"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            {selected && (
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="text-lg font-bold" style={{ color: colors.text }}>
              {selected ? selected.title : "Video Library"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
            style={{ backgroundColor: `${colors.border}`, color: colors.text }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        {selected ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="relative w-full" style={{ aspectRatio: "16/9", backgroundColor: "#000" }}>
              <video
                ref={videoRef}
                src={selected.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
            {selected.description && (
              <div className="px-6 py-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  {selected.description}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {VIDEO_LIBRARY.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  No videos available.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VIDEO_LIBRARY.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => setSelected(video)}
                    className="flex items-start gap-4 p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
                    style={{
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex-none flex items-center justify-center"
                      style={{ backgroundColor: `${colors.primary}15` }}
                    >
                      <Play size={20} style={{ color: colors.primary }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: colors.text }}>
                        {video.title}
                      </div>
                      {video.description && (
                        <div className="text-xs mt-1 line-clamp-2" style={{ color: colors.textMuted }}>
                          {video.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
