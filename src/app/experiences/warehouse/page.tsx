"use client";

import { Suspense } from "react";
import { colors } from "@/config/theme";
import { WarehouseHeader, WarehouseIndoorPositioningTab, WarehousePassiveTrackingTab, WarehouseRailCamTab } from "@/app/component/app-warehouse";
import ThemedToaster from "@/app/component/app-toaster/ThemedToaster";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { useExperienceState } from "@/hooks/useExperienceState";
import VideoLibraryButton from "@/app/component/app-video-library/VideoLibraryButton";

// Tab configuration
const TABS = {
  indoorPositioning: "Indoor Positioning",
  passiveTracking: "Passive Tracking",
  railCam: "Rail Cam",
} as const;

const TABS_ARRAY = Object.values(TABS);

function WarehouseExperienceContent() {
  const { isReady, activeTab, setActiveTab } = useExperienceState({
    pageKey: "warehouse",
    tabs: TABS_ARRAY,
    defaultTab: TABS.indoorPositioning,
  });

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
          <main className="px-8 py-2 flex-1 min-h-0">
            {/* Indoor Positioning Tab */}
            {activeTab === TABS.indoorPositioning && (
              <WarehouseIndoorPositioningTab accentColor={colors.warehouseAccent} />
            )}

            {/* Passive Tracking Tab */}
            {activeTab === TABS.passiveTracking && (
              <WarehousePassiveTrackingTab accentColor={colors.warehouseAccent} />
            )}

            {/* Rail Cam Tab */}
            {activeTab === TABS.railCam && (
              <WarehouseRailCamTab accentColor={colors.warehouseAccent} />
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
    <Suspense fallback={<WarehousePageFallback />}>
      <WarehouseExperienceContent />
    </Suspense>
  );
}

