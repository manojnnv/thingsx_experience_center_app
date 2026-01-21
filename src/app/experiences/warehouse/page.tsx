"use client";

import { useState } from "react";
import Link from "next/link";
import { colors } from "@/config/theme";
import SensorsVideoIntro from "@/app/component/app-sensors/SensorsVideoIntro";

export default function WarehouseExperiencePage() {
  const [showVideo, setShowVideo] = useState(true);

  return (
    <div
      className="min-h-screen text-white relative"
      style={{ backgroundColor: colors.background }}
    >
      <SensorsVideoIntro
        show={showVideo}
        onSkip={() => setShowVideo(false)}
        title="Warehouse Experience"
        subtitle="Experience inventory tracking, asset management, and logistics optimization."
        buttonLabel="Enter"
        accentColor={colors.orange}
      />

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 px-8">
        <Link
          href="/experiences"
          className="inline-flex items-center gap-2 text-sm transition-colors duration-300 group"
          style={{ color: colors.textMuted }}
        >
          <svg
            className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="group-hover:text-white">Back to Experience Center</span>
        </Link>
      </header>

      <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-8">
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${colors.orange}20` }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.orange}
              strokeWidth={1.5}
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819"
              />
            </svg>
          </div>
          <h1
            className="text-4xl font-bold mb-4"
            style={{ color: colors.orange }}
          >
            Warehouse Experience
          </h1>
          <p style={{ color: colors.textMuted }}>
            Experience coming soon...
          </p>
        </div>
      </main>
    </div>
  );
}
