"use client";

import React, { useState } from "react";
import { FolderOpen } from "lucide-react";
import { colors } from "@/config/theme";
import VideoLibraryModal from "./VideoLibraryModal";

export default function VideoLibraryButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
        style={{
          backgroundColor: colors.backgroundElevated,
          border: `1px solid ${colors.border}`,
          color: colors.primary,
          boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
        }}
        title="Video Library"
      >
        <FolderOpen size={22} />
      </button>

      <VideoLibraryModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
