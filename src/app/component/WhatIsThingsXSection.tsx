"use client";

import Link from "next/link";
import { colors } from "@/config/theme";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

export function WhatIsThingsXSection() {
  return (
    <section
      id="what-is-thingsx"
      className="relative z-10 h-screen flex items-center justify-center px-8 md:px-16 pt-24 pb-16 box-border"
    >
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-4 scroll-mt-24">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div
              className="h-[1px] w-12"
              style={{ backgroundColor: colors.primary }}
            />
            <span
              className="text-sm font-medium tracking-wider uppercase"
              style={{ color: colors.primary }}
            >
              The Platform
            </span>
            <div
              className="h-[1px] w-12"
              style={{ backgroundColor: colors.primary }}
            />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            What Is <span style={{ color: colors.primary }}>ThingsX</span>?
          </h2>
          <p
            className="text-lg md:text-xl max-w-3xl mx-auto mb-8"
            style={{ color: colors.textMuted }}
          >
            A modular IoT + AI ecosystem that overlays your infrastructure. It
            senses, thinks, and acts—delivering smarter operations without
            disruption.
          </p>
        </div>

        <ArchitectureDiagram />

        {/* Start Experience Button */}
        <div className="text-center mt-10">
          <Link
            href="/experiences"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
            style={{
              backgroundColor: colors.primary,
              color: colors.background,
              boxShadow: `0 0 20px ${colors.primary}30`,
            }}
          >
            <span>Start Experience</span>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
