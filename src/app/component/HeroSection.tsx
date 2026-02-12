"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { animate, stagger } from "animejs";
import { colors } from "@/config/theme";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

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

    animate(".hero-cta", {
      opacity: [0, 1],
      translateY: [15, 0],
      duration: 800,
      delay: 700,
      easing: "easeOutCubic",
    });
  }, []);

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative z-10 h-screen flex flex-col overflow-hidden"
    >
      {/* Header */}
      <header className="flex-none flex items-center justify-between px-8 md:px-16 py-4">
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

      {/* Title + Subtitle */}
      <div className="flex-none text-center px-8 md:px-16 pt-2 pb-1">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.1] mb-2">
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
          className="hero-subtitle text-base md:text-lg max-w-3xl mx-auto"
          style={{ color: colors.textMuted, opacity: 0 }}
        >
          A modular IoT + AI ecosystem that overlays your infrastructure.
          Powered by{" "}
          <span style={{ color: colors.primary, fontWeight: 600 }}>
            ThingsX
          </span>
        </p>
      </div>

      {/* Architecture Diagram - fills remaining space */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-8">
        <ArchitectureDiagram />
      </div>

      {/* Start Experience Button */}
      <div className="flex-none text-center py-3 hero-cta" style={{ opacity: 0 }}>
        <Link
          href="/experiences"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
          style={{
            backgroundColor: colors.primary,
            color: colors.background,
            boxShadow: `0 0 20px ${colors.primary}30`,
          }}
        >
          <span>Start Experience</span>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>
      </div>
    </section>
  );
}
