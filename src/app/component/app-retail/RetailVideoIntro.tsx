"use client";

import React from "react";
import { colors } from "@/config/theme";

function RetailVideoIntro({
  show,
  accent,
  onEnter,
}: {
  show: boolean;
  accent: string;
  onEnter: () => void;
}) {
  if (!show) return null;

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
          onClick={onEnter}
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

export default RetailVideoIntro;
