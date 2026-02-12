"use client";

import React from "react";
import { colors } from "@/config/theme";

function ExperiencesTitle() {
  return (
    <div className="text-center mb-6">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div
          className="h-[2px] w-12"
          style={{ backgroundColor: colors.primary }}
        />
        <span
          className="text-sm font-medium tracking-widest uppercase"
          style={{ color: colors.primary }}
        >
          ThingsX
        </span>
        <div
          className="h-[2px] w-12"
          style={{ backgroundColor: colors.primary }}
        />
      </div>
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
        Experience Center
      </h1>
      <p
        className="text-lg md:text-xl max-w-2xl mx-auto"
        style={{ color: colors.textMuted }}
      >
        Choose an experience to explore the power of IoT
      </p>
    </div>
  );
}

export default ExperiencesTitle;
