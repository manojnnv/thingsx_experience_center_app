"use client";

import { colors } from "@/config/theme";

// ===========================================
// Types
// ===========================================

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
}

interface AppTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  accentColor?: string;
}

// ===========================================
// AppTabs Component
// ===========================================

export function AppTabs({ tabs, activeTab, onTabChange, accentColor }: AppTabsProps) {
  const accent = accentColor || colors.primary;

  return (
    <div 
      className="flex gap-1 p-1.5 rounded-2xl w-fit" 
      style={{ 
        backgroundColor: colors.backgroundCard, 
        border: `1px solid ${colors.border}` 
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className="px-6 py-3 rounded-xl transition-all flex items-center gap-2"
          style={{
            backgroundColor: activeTab === tab.id ? accent : colors.transparent,
            color: activeTab === tab.id ? colors.background : colors.textMuted,
            fontWeight: activeTab === tab.id ? "bold" : "normal",
          }}
        >
          {tab.icon && <span>{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default AppTabs;
