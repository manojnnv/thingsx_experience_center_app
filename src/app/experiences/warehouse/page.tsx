"use client";

import { Suspense } from "react";
import { colors } from "@/config/theme";
import VideoIntro from "@/app/component/app-experience/VideoIntro";
import { WarehouseHeader, WarehouseIndoorPositioningTab } from "@/app/component/app-warehouse";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { useExperienceState } from "@/hooks/useExperienceState";

// Tab configuration
const TABS = {
  indoorPositioning: "Indoor Positioning",
  railCam: "Rail Cam",
} as const;

const TABS_ARRAY = Object.values(TABS);

function WarehouseExperienceContent() {
  const { showVideo, skipVideo, activeTab, setActiveTab } = useExperienceState({
    pageKey: "warehouse",
    tabs: TABS_ARRAY,
    defaultTab: TABS.indoorPositioning,
  });

  return (
    <TooltipProvider>
      <div
        className="min-h-screen text-white relative"
        style={{ backgroundColor: colors.background }}
      >
        <Toaster position="top-right" richColors />

        <VideoIntro
          show={showVideo}
          onSkip={skipVideo}
          title="Warehouse Experience"
          subtitle="Experience indoor positioning, rail cam monitoring, and logistics optimization."
          buttonLabel="Enter"
          accentColor={colors.warehouseAccent}
        />

        {/* Main Content */}
        <div
          className={
            showVideo ? "opacity-0" : "opacity-100 transition-opacity duration-500"
          }
        >
          <WarehouseHeader
            tabs={TABS_ARRAY}
            defaultTab={TABS.indoorPositioning}
            onTabChange={(tab) => setActiveTab(tab)}
            accentColor={colors.warehouseAccent}
            activeTab={activeTab}
          />

          {/* Content Area */}
          <main className="px-8 py-6">
            {/* Indoor Positioning Tab */}
            {activeTab === TABS.indoorPositioning && (
              <WarehouseIndoorPositioningTab accentColor={colors.warehouseAccent} />
            )}

            {/* Rail Cam Tab - Placeholder */}
            {activeTab === TABS.railCam && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${colors.warehouseAccent}20` }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={colors.warehouseAccent}
                      strokeWidth={1.5}
                      className="w-8 h-8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                      />
                    </svg>
                  </div>
                  <h2
                    className="text-2xl font-bold mb-2"
                    style={{ color: colors.warehouseAccent }}
                  >
                    Rail Cam
                  </h2>
                  <p style={{ color: colors.textMuted }}>Coming soon...</p>
                </div>
              </div>
            )}
          </main>
        </div>
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

