"use client";

import { useRef, useEffect } from "react";
import { animate, stagger } from "animejs";
import { colors } from "@/config/theme";

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current || !heroRef.current) return;
    hasAnimated.current = true;

    // Animate hero elements
    animate(".hero-logo-left", {
      opacity: [0, 1],
      translateX: [-30, 0],
      duration: 800,
      easing: "easeOutCubic",
    });

    animate(".hero-logo-right", {
      opacity: [0, 1],
      translateX: [30, 0],
      duration: 800,
      easing: "easeOutCubic",
    });

    animate(".hero-accent", {
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 600,
      delay: 200,
      easing: "easeOutBack",
    });

    animate(".hero-title-word", {
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800,
      delay: stagger(100),
      easing: "easeOutCubic",
    });

    animate(".hero-description", {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 800,
      delay: 600,
      easing: "easeOutCubic",
    });
  }, []);

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative z-10 min-h-screen flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-8 md:px-16 py-8">
        <div className="hero-logo-left opacity-0">
          <span className="text-2xl md:text-3xl tracking-tight font-semibold">
            intello<span style={{ color: colors.primary }}>bots</span>
          </span>
        </div>

        <div className="hero-logo-right opacity-0 text-right">
          <span
            className="text-2xl md:text-3xl tracking-tight font-semibold"
            style={{ color: colors.text }}
          >
            Things<span style={{ color: colors.primary }}>X</span>
          </span>
          <div
            className="text-xs tracking-wider mt-1"
            style={{ color: colors.textSubtle }}
          >
            IoT Platform
          </div>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="flex-1 flex items-center justify-center px-8 md:px-16 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="hero-accent opacity-0 flex items-center justify-center gap-4 mb-6">
            <div
              className="h-[2px] w-16"
              style={{ backgroundColor: colors.primary }}
            />
            <span
              className="text-sm font-medium tracking-wider uppercase"
              style={{ color: colors.primary }}
            >
              Experience Center
            </span>
            <div
              className="h-[2px] w-16"
              style={{ backgroundColor: colors.primary }}
            />
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8">
            <span className="hero-title-word opacity-0 inline-block">
              Where
            </span>{" "}
            <span className="hero-title-word opacity-0 inline-block">IoT</span>
            <br />
            <span className="hero-title-word opacity-0 inline-block">
              Becomes
            </span>{" "}
            <span
              className="hero-title-word opacity-0 inline-block"
              style={{ color: colors.primary }}
            >
              Tangible
            </span>
          </h1>

          <p
            className="hero-description opacity-0 text-xl leading-relaxed mb-10 max-w-2xl mx-auto"
            style={{ color: colors.textMuted }}
          >
            Walk through live demonstrations of industrial intelligence. Touch
            the hardware. See the data. Experience the future of connected
            operations.
          </p>
        </div>
      </main>
    </section>
  );
}
