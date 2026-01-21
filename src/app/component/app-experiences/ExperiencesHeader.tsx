"use client";

import React from "react";
import Link from "next/link";
import { colors } from "@/config/theme";

function ExperiencesHeader() {
  return (
    <header className="relative z-10 pt-8 pb-4 px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm transition-colors duration-300 group"
        style={{ color: colors.textMuted }}
      >
        <svg
          className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        <span className="group-hover:text-white">Back to Home</span>
      </Link>
    </header>
  );
}

export default ExperiencesHeader;
