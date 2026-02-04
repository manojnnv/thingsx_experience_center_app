"use client";
import React, { useState, useEffect } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { colors } from "@/config/theme";

type AppTabsProps = {
  defaultTab: string;
  tabs: string[];
  tabContents: React.ReactNode[];
  className?: string;
  onTabChange?: (tab: string) => void;
  accentColor?: string;
  /** Controlled active tab - when provided, component is controlled by parent */
  activeTab?: string;
};

function AppTabs({
  defaultTab,
  tabs,
  tabContents,
  className,
  onTabChange,
  accentColor,
  activeTab: controlledActiveTab,
}: AppTabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab);

  // Use controlled value if provided, otherwise use internal state
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const accent = accentColor || colors.primary;

  // Sync internal state when controlled value changes
  useEffect(() => {
    if (controlledActiveTab !== undefined) {
      setInternalActiveTab(controlledActiveTab);
    }
  }, [controlledActiveTab]);

  return (
    <div className="w-full mt-2">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setInternalActiveTab(value);
          if (onTabChange) {
            onTabChange(value);
          }
        }}
        className="gap-4"
      >
        <TabsList
          className={`${className} bg-transparent relative rounded-full border border-white/10 px-2 py-1`}
          style={{ backgroundColor: colors.backgroundCard }}
        >
          {tabs?.map((tab, index) => (
            <TabsTrigger
              key={index}
              value={tab}
              className="bg-transparent relative z-10 rounded-full border-0 data-[state=active]:shadow-none cursor-pointer px-5 py-2 text-sm font-semibold transition-all"
              style={{
                color: activeTab === tab ? colors.background : colors.textMuted,
                backgroundColor: activeTab === tab ? accent : "transparent",
              }}
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabContents?.length > 0 && (
          <div className="w-full">
            {tabContents?.map((item, index) => (
              <TabsContent className="w-full" key={index} value={tabs[index]}>
                {item}
              </TabsContent>
            ))}
          </div>
        )}
      </Tabs>
    </div>
  );
}

export default AppTabs;
