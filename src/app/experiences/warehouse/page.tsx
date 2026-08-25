"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { colors } from "@/config/theme";
import WarehouseHeader from "@/app/component/app-warehouse/WarehouseHeader";
import ThemedToaster from "@/app/component/app-toaster/ThemedToaster";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { useExperienceState } from "@/hooks/useExperienceState";
import VideoLibraryButton from "@/app/component/app-video-library/VideoLibraryButton";
import { ExperienceErrorBoundary } from "@/app/component/ExperienceErrorBoundary";

const WarehouseIndoorPositioningTab = dynamic(
  () => import("@/app/component/app-warehouse/WarehouseIndoorPositioningTab"),
  { ssr: false }
);
const WarehousePassiveTrackingTab = dynamic(
  () => import("@/app/component/app-warehouse/WarehousePassiveTrackingTab"),
  { ssr: false }
);
const WarehouseRailCamTab = dynamic(
  () => import("@/app/component/app-warehouse/WarehouseRailCamTab"),
  { ssr: false }
);

// Tab configuration
const TABS = {
  indoorPositioning: "Indoor Positioning",
  passiveTracking: "Passive Tracking",
  railCam: "Rail Cam",
} as const;

const TABS_ARRAY = Object.values(TABS);

function KeepAlivePane({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={active ? "h-full" : "invisible pointer-events-none absolute inset-0"}
    >
      {children}
    </div>
  );
}

function WarehouseExperienceContent() {
  const { isReady, activeTab, setActiveTab } = useExperienceState({
    pageKey: "warehouse",
    tabs: TABS_ARRAY,
    defaultTab: TABS.indoorPositioning,
  });
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const shownTabs = visitedTabs.has(activeTab)
    ? visitedTabs
    : new Set([...visitedTabs, activeTab]);

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
    <TooltipProvider>
      <div
        className="min-h-screen text-white relative"
        style={{ backgroundColor: colors.background }}
      >
        <ThemedToaster accentColor={colors.warehouseAccent} />

        {/* Main Content */}
        <div className="flex flex-col h-screen">
          <WarehouseHeader
            tabs={TABS_ARRAY}
            defaultTab={TABS.indoorPositioning}
            onTabChange={(tab) => setActiveTab(tab)}
            accentColor={colors.warehouseAccent}
            activeTab={activeTab}
          />

          {/* Content Area */}
          <main className="px-8 py-2 flex-1 min-h-0 relative">
            {shownTabs.has(TABS.indoorPositioning) && (
              <KeepAlivePane active={activeTab === TABS.indoorPositioning}>
                <WarehouseIndoorPositioningTab
                  accentColor={colors.warehouseAccent}
                  visible={activeTab === TABS.indoorPositioning}
                />
              </KeepAlivePane>
            )}

            {shownTabs.has(TABS.passiveTracking) && (
              <KeepAlivePane active={activeTab === TABS.passiveTracking}>
                <WarehousePassiveTrackingTab accentColor={colors.warehouseAccent} />
              </KeepAlivePane>
            )}

            {shownTabs.has(TABS.railCam) && (
              <KeepAlivePane active={activeTab === TABS.railCam}>
                <WarehouseRailCamTab accentColor={colors.warehouseAccent} />
              </KeepAlivePane>
            )}
          </main>
        </div>
        <VideoLibraryButton />
      </div>
    </TooltipProvider>
  );
}

function WarehousePageFallback() {
  return (
    <div
      className="min-h-screen text-white relative flex items-center justify-center"
      style={{ backgroundColor: colors.background }}
    >
      <span style={{ color: colors.textMuted }}>Loading...</span>
    </div>
  );
}

export default function WarehouseExperiencePage() {
  return (
    <ExperienceErrorBoundary>
      <Suspense fallback={<WarehousePageFallback />}>
        <WarehouseExperienceContent />
      </Suspense>
    </ExperienceErrorBoundary>
  );
}
