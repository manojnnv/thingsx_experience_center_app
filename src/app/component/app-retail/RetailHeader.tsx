"use client";

import React from "react";
import Link from "next/link";
import { colors } from "@/config/theme";
import AppTabs from "@/app/component/app-tabs/AppTabs";

function RetailHeader({
  accent,
  tabs,
  defaultTab,
  onTabChange,
  accentColor,
  activeTab,
}: {
  accent: string;
  tabs: string[];
  defaultTab: string;
  onTabChange: (tab: string) => void;
  accentColor?: string;
  activeTab?: string;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 px-8 py-4" style={{ backgroundColor: `${colors.background}ee`, backdropFilter: "blur(10px)" }}>
        <div className="flex items-center justify-between">
          <Link href="/experiences" className="inline-flex items-center gap-2 text-sm transition-colors duration-300 group" style={{ color: colors.textMuted }}>
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="group-hover:text-white">Back</span>
          </Link>

          <h1 className="text-xl font-bold" style={{ color: accent }}>Retail Simulation</h1>

          <div className="w-20" />
        </div>
      </header>

      <div className="px-8 py-4">
        <AppTabs
          defaultTab={defaultTab}
          tabs={tabs}
          tabContents={[]}
          onTabChange={onTabChange}
          accentColor={accentColor || accent}
          activeTab={activeTab}
        />
      </div>
    </>
  );
}

export default RetailHeader;
