"use client";

import React from "react";
import Link from "next/link";
import { colors } from "@/config/theme";
import AppTabs from "@/app/component/app-tabs/AppTabs";

function SensorsHeader({
  tabs,
  defaultTab,
  onTabChange,
  accentColor,
  activeTab,
  onRefresh,
  isRefreshing,
}: {
  tabs: string[];
  defaultTab: string;
  onTabChange: (tab: string) => void;
  accentColor?: string;
  activeTab?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 px-8 py-4" style={{ backgroundColor: `${colors.background}ee`, backdropFilter: "blur(10px)" }}>
        <div className="flex justify-between items-center">
          <Link href="/experiences" className="inline-flex items-center gap-2 text-sm transition-colors duration-300 group" style={{ color: colors.textMuted }}>
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="group-hover:text-white">Back</span>
          </Link>
          <h1 className="text-xl font-bold" style={{ color: colors.yellow }}>Sensors & Endnodes</h1>
          <div className="w-20" />
        </div>

        {/* Tab Navigation with Refresh Button */}
        <div className="px-8 py-4 flex items-center justify-between">
          <AppTabs
            defaultTab={defaultTab}
            tabs={tabs}
            tabContents={[]}
            onTabChange={onTabChange}
            accentColor={accentColor}
            activeTab={activeTab}
          />
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg transition-all duration-300 hover:bg-white/10 disabled:opacity-50 ml-4"
              style={{ color: colors.textMuted }}
              title="Refresh data"
            >
              <svg
                className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
        </div>
      </header>
    </>
  );
}

export default SensorsHeader;
