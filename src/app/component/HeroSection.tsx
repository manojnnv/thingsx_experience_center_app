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

    animate(".hero-title-word", {
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800,
      delay: stagger(100),
      easing: "easeOutCubic",
    });

    animate(".hero-subtitle", {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 800,
      delay: 500,
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
        <div className="hero-logo-left" style={{ opacity: 0 }}>
          <span className="text-2xl md:text-3xl tracking-tight font-semibold">
            intello<span style={{ color: colors.primary }}>bots</span>
          </span>
        </div>

        <div className="hero-logo-right text-right" style={{ opacity: 0 }}>
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
        <div className="max-w-4xl mx-auto text-center -mt-20">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
            <span className="hero-title-word inline-block" style={{ opacity: 0 }}>
              Welcome to the
            </span>
            <br />
            <span className="hero-title-word inline-block" style={{ opacity: 0 }}>
              Intellobots
            </span>{" "}
            <span
              className="hero-title-word inline-block"
              style={{ color: colors.primary, opacity: 0 }}
            >
              Experience Centre
            </span>
          </h1>

          <p
            className="hero-subtitle text-xl md:text-2xl"
            style={{ color: colors.textMuted, opacity: 0 }}
          >
            Powered by{" "}
            <span style={{ color: colors.primary, fontWeight: 600 }}>
              ThingsX
            </span>
          </p>
        </div>
      </main>
    </section>
  );
}
