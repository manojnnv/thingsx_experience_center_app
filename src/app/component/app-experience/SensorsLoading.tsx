"use client";

import React from "react";
import { colors } from "@/config/theme";

function SensorsLoading({ loading }: { loading: boolean }) {
  if (!loading) return null;

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${colors.yellow} transparent ${colors.yellow} ${colors.yellow}` }} />
        <p style={{ color: colors.textMuted }}>Loading devices...</p>
      </div>
    </div>
  );
}

export default SensorsLoading;
