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
}: {
  tabs: string[];
  defaultTab: string;
  onTabChange: (tab: string) => void;
  accentColor?: string;
  activeTab?: string;
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
    </>
  );
}

export default SensorsHeader;
