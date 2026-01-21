"use client";

import { colors } from "@/config/theme";

export function Footer() {
  return (
    <footer
      className="relative z-10 px-8 md:px-16 py-8 text-sm flex items-center justify-between"
      style={{
        color: colors.textSubtle,
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      <span>© 2026 Intellobots</span>
      <span>ThingsX IoT Platform</span>
    </footer>
  );
}
