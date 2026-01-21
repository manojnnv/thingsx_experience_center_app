"use client";

import { useRef } from "react";
import { colors } from "@/config/theme";
import { FixedGradientBackground } from "@/app/component/FixedGradientBackground";
import { LiveBackground } from "@/app/component/LiveBackground";
import { NavigationDots } from "@/app/component/NavigationDots";
import { HeroSection } from "@/app/component/HeroSection";
import { WhatIsThingsXSection } from "@/app/component/WhatIsThingsXSection";
import { WhyItWinsSection } from "@/app/component/WhyItWinsSection";
import { useScrollTracking } from "@/hooks/useScrollTracking";

export default function Home() {
  const pageRef = useRef<HTMLDivElement>(null);

  // Sections for navigation
  const sections = [
    { id: "hero", label: "Home" },
    { id: "what-is-thingsx", label: "What Is ThingsX?" },
    { id: "why-it-wins", label: "Why It Wins" },
  ];

  const { activeSection, scrollToSection } = useScrollTracking(sections);

  return (
    <div
      ref={pageRef}
      className="text-white overflow-x-hidden"
      style={{ backgroundColor: colors.background }}
    >
      <FixedGradientBackground />
      <LiveBackground />
      <NavigationDots
        sections={sections}
        activeSection={activeSection}
        onSectionClick={scrollToSection}
      />
      <HeroSection />
      <WhatIsThingsXSection />
      <WhyItWinsSection />
    </div>
  );
}
