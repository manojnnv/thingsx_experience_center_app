"use client";

import { colors } from "@/config/theme";
import { FixedGradientBackground } from "@/app/component/FixedGradientBackground";
import { LiveBackground } from "@/app/component/LiveBackground";
import { HeroSection } from "@/app/component/HeroSection";
import { WhatIsThingsXSection } from "@/app/component/WhatIsThingsXSection";

export default function Home() {
  return (
    <div
      className="text-white overflow-x-hidden min-h-screen"
      style={{ backgroundColor: colors.background }}
    >
      <FixedGradientBackground />
      <LiveBackground />
      <HeroSection />
      <WhatIsThingsXSection />
    </div>
  );
}
