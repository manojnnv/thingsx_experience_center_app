"use client";

import { useRef } from "react";
import { colors } from "@/config/theme";
import { FixedGradientBackground } from "@/components/FixedGradientBackground";
import { LiveBackground } from "@/components/LiveBackground";
import { NavigationDots } from "@/components/NavigationDots";
import { HeroSection } from "@/components/HeroSection";
import { WhatIsThingsXSection } from "@/components/WhatIsThingsXSection";
import { WhyItWinsSection } from "@/components/WhyItWinsSection";
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
