"use client";

import { colors } from "@/config/theme";

interface ScrollProgressBarProps {
  progress: number;
}

export function ScrollProgressBar({ progress }: ScrollProgressBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 h-1 z-50 transition-all duration-100"
      style={{
        width: `${progress}%`,
        backgroundColor: colors.primary,
        boxShadow: `0 0 10px ${colors.primaryMuted}`,
      }}
    />
  );
}
