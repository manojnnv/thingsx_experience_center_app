"use client";

import React from "react";
import { colors } from "@/config/theme";

function VideoIntro({
  show,
  onSkip,
  title = "Sensors & Endnodes",
  subtitle = "Discover how IoT sensors revolutionize your operations",
  buttonLabel = "Skip Intro",
  accentColor = colors.yellow,
}: {
  show: boolean;
  onSkip: () => void;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  accentColor?: string;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: colors.background }}>
      <div className="relative w-full max-w-4xl mx-8">
        <div
          className="relative aspect-video rounded-2xl overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: colors.backgroundCard, border: `2px solid ${accentColor}30` }}
        >
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
              <svg viewBox="0 0 24 24" fill={accentColor} className="w-12 h-12">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: accentColor }}>{title}</h2>
            <p style={{ color: colors.textMuted }}>{subtitle}</p>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="absolute bottom-6 right-6 px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2"
          style={{ backgroundColor: accentColor, color: colors.background }}
        >
          <span>{buttonLabel}</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default VideoIntro;
