"use client";

import { colors } from "@/config/theme";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

export function WhatIsThingsXSection() {
  return (
    <section
      id="what-is-thingsx"
      className="relative z-10 min-h-screen flex items-center justify-center px-8 md:px-16 py-12"
    >
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-5">
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
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5">
            What Is <span style={{ color: colors.primary }}>ThingsX</span>?
          </h2>
          <p
            className="text-lg max-w-3xl mx-auto mb-0"
            style={{ color: colors.textMuted }}
          >
            A modular IoT + AI ecosystem that overlays your infrastructure. It
            senses, thinks, and acts—delivering smarter operations without
            disruption.
          </p>
        </div>

        <ArchitectureDiagram />
      </div>
    </section>
  );
}
