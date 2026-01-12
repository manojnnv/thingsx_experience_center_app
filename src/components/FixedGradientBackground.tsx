"use client";

import { colors } from "@/config/theme";

export function FixedGradientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${colors.primaryFaint} 0%, transparent 50%),
                       radial-gradient(ellipse at 70% 80%, ${colors.primaryFaint} 0%, transparent 40%),
                       ${colors.background}`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(${colors.primary} 1px, transparent 1px),
                            linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}
