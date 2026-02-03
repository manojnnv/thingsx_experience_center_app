"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { colors } from "@/config/theme";

// Roadmap stage labels (from reference image)
const JOURNEY_STAGES = [
  "Ideation & Discovery",
  "Solution Design",
  "Rapid PoC Build",
  "Validation",
  "Pilot Deployment",
  "Productization",
];

const accent = colors.innovationLabAccent ?? colors.primary;

// Folder "end to end journey" – spaces encoded as %20 in URL
const END_TO_END_JOURNEY_BASE = "/assets/innovation-lab/end%20to%20end%20journey";
const END_TO_END_JOURNEY_IMAGES = [
  { src: `${END_TO_END_JOURNEY_BASE}/Ideation-&-Use-Case-Discovery.png`, label: "Ideation & Use Case Discovery" },
  { src: `${END_TO_END_JOURNEY_BASE}/Solution-Design-&-Architecture.png`, label: "Solution Design & Architecture" },
  { src: `${END_TO_END_JOURNEY_BASE}/Rapid-PoC-MVP-Build-2–6%20Weeks.png`, label: "Rapid PoC/MVP Build (2–6 Weeks)" },
  { src: `${END_TO_END_JOURNEY_BASE}/Validation-with-Stakeholders.png`, label: "Validation with Stakeholders" },
  { src: `${END_TO_END_JOURNEY_BASE}/Pilot-Deployment-&-Industry-Readiness.png`, label: "Pilot Deployment & Industry Readiness" },
  { src: `${END_TO_END_JOURNEY_BASE}/Productization-&-Scale.png`, label: "Productization & Scale" },
];

// Per-stage detail content (from Figma; add output for stages that have it)
const JOURNEY_STAGE_DETAILS: { description: string; bullets?: string[]; output?: string }[] = [
  {
    description: "We collaborate with your business and technical stakeholders to identify high-value opportunities and define measurable outcomes.",
    bullets: [
      "Problem framing and opportunity mapping",
      "Use case prioritization (impact vs feasibility)",
      "KPI definition and success criteria",
      "Data + infrastructure readiness assessment",
      "ROI and value hypothesis",
    ],
    output: "Shortlisted use cases + PoC roadmap + effort estimates",
  },
  { description: "Solution Design: define architecture, tech stack, and implementation approach.", bullets: ["Solution architecture", "Technology selection", "Implementation roadmap"] },
  { description: "Rapid PoC Build: deliver a working proof of concept in 2–6 weeks.", bullets: ["Sprint-based delivery", "Iterative feedback", "Demo-ready PoC"] },
  { description: "Validation: validate with stakeholders and refine before pilot.", bullets: ["Stakeholder demos", "Feedback integration", "Go/no-go for pilot"] },
  { description: "Pilot Deployment: run a controlled pilot in your environment.", bullets: ["Pilot planning", "Deployment support", "Industry readiness"] },
  { description: "Productization & Scale: harden for production and scale across the organization.", bullets: ["Production hardening", "Scaling strategy", "Handover and support"] },
];

export default function InnovationLabPage() {
  const [selectedJourneyStage, setSelectedJourneyStage] = useState(0);

  const gridColor = `${(accent || "").trim()}12`;

  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        backgroundColor: colors.background,
        backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    >
      {/* Header – matches Retail/Sensors: no border, "Back" label */}
      <header
        className="sticky top-0 z-40 px-8 py-4"
        style={{ backgroundColor: `${colors.background}ee`, backdropFilter: "blur(10px)" }}
      >
        <div className="flex items-center justify-between">
          <Link
            href="/experiences"
            className="inline-flex items-center gap-2 text-sm transition-colors duration-300 group"
            style={{ color: colors.textMuted }}
          >
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="group-hover:text-white">Back</span>
          </Link>
          <h1 className="text-xl font-bold" style={{ color: accent }}>
            Innovation Lab
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero: Innovation Labs as a Service (ILaaS) – viewport 1 */}
        <section className="min-h-screen flex flex-col justify-center max-w-5xl mx-auto px-8 py-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4" style={{ color: colors.text }}>
            Innovation Labs as a Service{" "}
            <span style={{ color: accent }}>(ILaaS)</span>
          </h2>
          <p className="text-lg md:text-xl text-center mb-12 max-w-3xl mx-auto" style={{ color: colors.textMuted }}>
            Accelerate enterprise innovation—using our state-of-the-art labs and Experience Center.
          </p>

          <div
            className="rounded-2xl p-8 md:p-10"
            style={{
              backgroundColor: colors.backgroundCard,
              border: `1px solid ${colors.border}`,
            }}
          >
            <p className="text-base md:text-lg leading-relaxed mb-6" style={{ color: colors.textMuted }}>
              Enterprises today want faster innovation, but building internal labs takes time, budget, approvals, equipment, and specialized teams.{" "}
              <span style={{ color: accent }}>Innovation Labs as a Service (ILaaS)</span>{" "}
              solves this by giving you access to a ready-to-run, enterprise-grade innovation ecosystem where you can move from{" "}
              <span style={{ color: accent }}>&quot;idea → PoC → pilot → productization&quot;</span>{" "}
              quickly and cost-effectively.
            </p>
            <p className="text-base md:text-lg leading-relaxed" style={{ color: colors.textMuted }}>
              Through our <span style={{ color: accent }}>Intellobots Innovation Labs</span> and Experience Center, we help organizations validate high-impact use cases in emerging technologies like{" "}
              <span style={{ color: accent }}>IoT, Industrial Automation, Robotics, Computer Vision, AI/ML, Edge Computing, and LLMs/GenAI</span>—with real infrastructure, real workflows, and measurable outcomes.
            </p>
          </div>
        </section>

        {/* End-to-end journey – roadmap + details card in same viewport */}
        <section className="min-h-screen flex flex-col max-w-5xl mx-auto px-8 py-6 md:py-8">
          <div className="flex flex-col flex-1 min-h-0">
            <h3 className="text-xl md:text-2xl font-bold text-center mb-1" style={{ color: colors.text }}>
              Our End-to-End <span style={{ color: accent }}>Innovation Journey</span>
            </h3>
            <p className="text-center text-sm mb-4 md:mb-6" style={{ color: colors.textMuted }}>
              From Ideation → Product PoC → Productization → Scale
            </p>

            {/* Timeline: horizontal line + 6 clickable circles */}
            <div className="relative flex items-start justify-between gap-2 mb-4 md:mb-6">
              <div
                className="absolute top-6 left-0 right-0 h-0.5 -z-0"
                style={{ backgroundColor: accent }}
              />
              {JOURNEY_STAGES.map((label, i) => {
                const isActive = selectedJourneyStage === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedJourneyStage(i)}
                    className="flex flex-col items-center flex-1 min-w-0 group"
                  >
                    <span
                      className="relative flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold shrink-0 transition-all duration-300"
                      style={{
                        backgroundColor: isActive ? accent : colors.backgroundCard,
                        color: isActive ? colors.background : accent,
                        border: isActive ? "none" : `2px solid ${accent}`,
                        boxShadow: isActive ? `0 0 24px ${accent}80, 0 0 48px ${accent}40` : "none",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="mt-2 text-center text-xs font-medium leading-tight max-w-[100px] sm:max-w-none"
                      style={{ color: isActive ? colors.text : colors.textMuted }}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Details card: text left, diagram right; fills remaining viewport */}
            <div
              className="flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden border border-solid"
              style={{
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
                boxShadow: `0 4px 24px ${colors.shadowMedium}`,
              }}
            >
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 md:p-6 overflow-auto">
                {/* Left: header, description, bullets, output */}
                <div className="flex flex-col min-w-0 order-2 lg:order-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ color: accent }} aria-hidden>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </span>
                    <span className="text-2xl font-bold tabular-nums" style={{ color: colors.text }}>{String(selectedJourneyStage + 1).padStart(2, "0")}</span>
                    <h4 className="text-lg font-bold truncate" style={{ color: colors.text }}>
                      {END_TO_END_JOURNEY_IMAGES[selectedJourneyStage].label}
                    </h4>
                  </div>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: colors.textMuted }}>
                    {JOURNEY_STAGE_DETAILS[selectedJourneyStage].description}
                  </p>
                  {JOURNEY_STAGE_DETAILS[selectedJourneyStage].bullets && (
                    <ul className="space-y-1.5 text-sm mb-3" style={{ color: colors.textMuted }}>
                      {JOURNEY_STAGE_DETAILS[selectedJourneyStage].bullets?.map((b, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <span style={{ color: accent }} className="shrink-0 mt-0.5" aria-hidden>✓</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {JOURNEY_STAGE_DETAILS[selectedJourneyStage].output && (
                    <div
                      className="mt-auto flex items-center gap-2 py-2 px-3 rounded-lg text-sm"
                      style={{ backgroundColor: colors.backgroundElevated, color: colors.text }}
                    >
                      <span style={{ color: accent }} aria-hidden>
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                      <span style={{ color: accent }} className="font-medium shrink-0">Output:</span>
                      <span>{JOURNEY_STAGE_DETAILS[selectedJourneyStage].output}</span>
                    </div>
                  )}
                </div>
                {/* Right: stage diagram image */}
                <div className="relative min-h-[200px] lg:min-h-0 lg:flex-1 rounded-xl overflow-hidden order-1 lg:order-2" style={{ backgroundColor: colors.backgroundElevated }}>
                  <Image
                    src={END_TO_END_JOURNEY_IMAGES[selectedJourneyStage].src}
                    alt={END_TO_END_JOURNEY_IMAGES[selectedJourneyStage].label}
                    fill
                    className="object-contain p-3"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
