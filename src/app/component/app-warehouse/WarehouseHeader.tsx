"use client";

import React from "react";
import Link from "next/link";
import { colors } from "@/config/theme";
import AppTabs from "@/app/component/app-tabs/AppTabs";

interface WarehouseHeaderProps {
  tabs: string[];
  defaultTab: string;
  onTabChange: (tab: string) => void;
  accentColor?: string;
  activeTab?: string;
  onReplayIntro?: () => void;
}

function WarehouseHeader({
  tabs,
  defaultTab,
  onTabChange,
  accentColor = colors.warehouseAccent,
  activeTab,
  onReplayIntro,
}: WarehouseHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 px-8 py-4"
      style={{
        backgroundColor: `${colors.background}ee`,
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex justify-between items-center">
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
          <span className="group-hover:text-white">Back</span>
        </Link>
        <h1 className="text-xl font-bold" style={{ color: accentColor }}>
          Warehouse Experience
        </h1>
        <div className="w-20 flex justify-end">
          {onReplayIntro && (
            <button
              onClick={onReplayIntro}
              className="p-2 rounded-lg transition-all duration-300 hover:bg-white/10"
              style={{ color: colors.textMuted }}
              title="Replay Intro"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-8 py-4">
        <AppTabs
          defaultTab={defaultTab}
          tabs={tabs}
          tabContents={[]}
          onTabChange={onTabChange}
          accentColor={accentColor}
          activeTab={activeTab}
        />
      </div>
    </header>
  );
}

export default WarehouseHeader;
