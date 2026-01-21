"use client";

import { colors } from "@/config/theme";

interface Section {
  id: string;
  label: string;
}

interface NavigationDotsProps {
  sections: Section[];
  activeSection: number;
  onSectionClick: (index: number) => void;
}

export function NavigationDots({
  sections,
  activeSection,
  onSectionClick,
}: NavigationDotsProps) {
  return (
    <nav className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4">
      {sections.map((section, index) => (
        <button
          key={section.id}
          onClick={() => onSectionClick(index)}
          className="group relative flex items-center justify-end"
          aria-label={`Go to ${section.label}`}
        >
          <span
            className="absolute right-8 px-3 py-1 rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              backgroundColor: colors.backgroundCard,
              color: colors.text,
              border: `1px solid ${colors.border}`,
            }}
          >
            {section.label}
          </span>
          <div
            className="w-3 h-3 rounded-full transition-all duration-300"
            style={{
              backgroundColor:
                activeSection === index ? colors.primary : colors.transparent,
              border: `2px solid ${
                activeSection === index ? colors.primary : colors.textSubtle
              }`,
              transform: activeSection === index ? "scale(1.2)" : "scale(1)",
              boxShadow:
                activeSection === index
                  ? `0 0 10px ${colors.primaryMuted}`
                  : "none",
            }}
          />
        </button>
      ))}
    </nav>
  );
}
