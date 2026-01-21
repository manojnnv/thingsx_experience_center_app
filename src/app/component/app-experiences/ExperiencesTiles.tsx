"use client";

import React, { useState } from "react";
import Link from "next/link";
import { colors } from "@/config/theme";

interface ExperienceTile {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  accentColor: string;
}

const experiences: ExperienceTile[] = [
  {
    id: "sensors",
    title: "Sensors & Endnodes",
    description: "Explore IoT sensors, environmental monitors, and edge devices in action",
    href: "/experiences/sensors",
    accentColor: colors.yellow,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-12 h-12"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>
    ),
  },
  {
    id: "retail",
    title: "Retail Experience",
    description: "Smart retail solutions with people counting, heatmaps, and analytics",
    href: "/experiences/retail",
    accentColor: colors.primary,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-12 h-12"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
        />
      </svg>
    ),
  },
  {
    id: "warehouse",
    title: "Warehouse Experience",
    description: "Inventory tracking, asset management, and logistics optimization",
    href: "/experiences/warehouse",
    accentColor: colors.orange,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-12 h-12"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819"
        />
      </svg>
    ),
  },
];

function ExperiencesTiles() {
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full max-w-6xl">
      {experiences.map((exp) => (
        <Link
          key={exp.id}
          href={exp.href}
          className="group relative"
          onMouseEnter={() => setHoveredTile(exp.id)}
          onMouseLeave={() => setHoveredTile(null)}
        >
          <div
            className="relative h-full p-8 rounded-2xl transition-all duration-500 overflow-hidden"
            style={{
              backgroundColor: colors.backgroundCard,
              border: `1px solid ${
                hoveredTile === exp.id ? exp.accentColor : colors.border
              }`,
              boxShadow:
                hoveredTile === exp.id
                  ? `0 0 40px ${exp.accentColor}20, 0 20px 40px ${colors.shadowDark}`
                  : `0 4px 20px ${colors.shadowMedium}`,
              transform:
                hoveredTile === exp.id
                  ? "translateY(-8px) scale(1.02)"
                  : "translateY(0) scale(1)",
            }}
          >
            {/* Glow effect on hover */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${exp.accentColor}15 0%, transparent 60%)`,
              }}
            />

            {/* Corner accent */}
            <div
              className="absolute top-0 right-0 w-24 h-24 opacity-10 group-hover:opacity-20 transition-opacity duration-500"
              style={{
                background: `radial-gradient(circle at 100% 0%, ${exp.accentColor} 0%, transparent 70%)`,
              }}
            />

            {/* Icon */}
            <div
              className="mb-6 transition-all duration-500"
              style={{
                color:
                  hoveredTile === exp.id
                    ? exp.accentColor
                    : colors.textMuted,
              }}
            >
              {exp.icon}
            </div>

            {/* Title */}
            <h2
              className="text-xl lg:text-2xl font-bold mb-3 transition-colors duration-300"
              style={{
                color: hoveredTile === exp.id ? exp.accentColor : colors.text,
              }}
            >
              {exp.title}
            </h2>

            {/* Description */}
            <p
              className="text-sm lg:text-base leading-relaxed mb-6"
              style={{ color: colors.textMuted }}
            >
              {exp.description}
            </p>

            {/* Arrow indicator */}
            <div
              className="flex items-center gap-2 text-sm font-medium transition-all duration-300"
              style={{
                color: exp.accentColor,
                opacity: hoveredTile === exp.id ? 1 : 0.6,
              }}
            >
              <span>Explore</span>
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>

            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1 transition-transform duration-500 origin-left"
              style={{
                backgroundColor: exp.accentColor,
                transform: hoveredTile === exp.id ? "scaleX(1)" : "scaleX(0)",
              }}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}

export default ExperiencesTiles;
