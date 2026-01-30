"use client";

import React from "react";
import { colors } from "@/config/theme";

interface AppLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

function AppLoading({ message = "Loading...", fullScreen = false }: AppLoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Spinner */}
      <div
        className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: `${colors.yellow}40`, borderTopColor: colors.yellow }}
      />
      {/* Message */}
      <p className="text-sm font-medium" style={{ color: colors.textMuted }}>
        {message}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ backgroundColor: `${colors.background}e6` }}
      >
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {content}
    </div>
  );
}

export default AppLoading;
