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

// Image paths (public/assets/innovation-lab)
const WHY_IL_IMAGES = {
  noCapex: "/assets/innovation-lab/Why_IL_images/No-lab-setup-No-capex-Start-immediately.png",
  stateOfTheArt: "/assets/innovation-lab/Why_IL_images/Access-a-state-of-the-art-working-environment.png",
  reduceCosts: "/assets/innovation-lab/Why_IL_images/Reduce-internal-project-setup-costs-and-delays.png",
  fillSkillGaps: "/assets/innovation-lab/Why_IL_images/Fill-skill-gaps-instantly.png",
} as const;

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

// Lab Setup and Enablement Services – order matches reference: 4 top row, 3 bottom row
const LAB_SETUP_ICONS = [
  { src: "/assets/innovation-lab/Lab_setup_icons/Innovation-lab-blueprint-and-design.png", label: "Innovation lab blueprint and design" },
  { src: "/assets/innovation-lab/Lab_setup_icons/Equipment-selection-and-procurement-guidance.png", label: "Equipment selection and procurement guidance" },
  { src: "/assets/innovation-lab/Lab_setup_icons/Robotics-+-vision-+-conveyor-setup-planning.png", label: "Robotics + vision + conveyor setup planning" },
  { src: "/assets/innovation-lab/Lab_setup_icons/OT-IT-network-design-and-security-baseline.png", label: "OT/IT network design and security baseline" },
  { src: "/assets/innovation-lab/Lab_setup_icons/Tooling-and-software-stack-recommendations.png", label: "Tooling and software stack recommendations" },
  { src: "/assets/innovation-lab/Lab_setup_icons/Operating-model-process-governance-PoC-pipeline.png", label: "Operating model (process, governance, PoC pipeline)" },
  { src: "/assets/innovation-lab/Lab_setup_icons/Training-and-enablement-for-your-teams.png", label: "Training and enablement for your teams" },
];

// What We Enable – 6 tiles from Figma
const whatWeEnableTiles = [
  {
    title: "Industrial automation PoCs",
    description: "(robotic pick & place, guided tasks, assembly assistance)",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 17.25v-1.41a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v1.41m-9 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-5.638A2.25 2.25 0 015.638 11H21" />
    ),
  },
  {
    title: "Computer vision solutions",
    description: "(quality inspection, anomaly detection, safety monitoring)",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    ),
  },
  {
    title: "IoT + edge analytics",
    description: "(real-time monitoring, alerts, dashboards, device integration)",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.662c5.086-5.086 13.308-5.086 18.394 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    ),
  },
  {
    title: "AI/ML use cases",
    description: "(predictive insights, forecasting, optimization)",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    ),
  },
  {
    title: "LLM/GenAI copilots",
    description: "(enterprise assistants, knowledge bots, workflow automation)",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-9.516 0c.85.493 1.509 1.333 1.509 2.316V18" />
    ),
  },
  {
    title: "OT-IT integration",
    description: "(PLCs, sensors, SCADA/MES/ERP integration)",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.527-.64 1.249-1.007 2.057-1.007c.806 0 1.524.368 2.057 1.006l.571.7M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m0 0L15.659 7.5" />
    ),
  },
];

const labEnvironmentBullets = [
  "Robotic arms and automation systems",
  "Computer vision stations (inspection + detection use cases)",
  "Edge computing and IoT connectivity",
  "Conveyor and material movement setups",
  "Warehouse and logistics demo environments",
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

        {/* Why IL for Enterprises? – single viewport with all 4 cards */}
        <section className="min-h-screen flex flex-col justify-center max-w-5xl mx-auto px-8 py-16">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-10" style={{ color: colors.text }}>
            Why IL for <span style={{ color: accent }}>Enterprises</span> ?
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Card 1: No lab setup – compact, uniform with card 2 */}
            <div
              className="rounded-2xl p-6 overflow-hidden"
              style={{
                backgroundColor: colors.backgroundCard,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div className="relative w-full aspect-video min-h-[200px] rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: colors.backgroundElevated }}>
                <Image src={WHY_IL_IMAGES.noCapex} alt="No lab setup. No capex. Start immediately." fill className="object-contain" sizes="(max-width: 1024px) 100vw, 50vw" />
              </div>
              <h4 className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                No lab setup. No capex. Start immediately.
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                Avoid months of effort spent on internal lab planning, procurement, infra readiness, approvals, and vendor onboarding. With ILaaS, you can start experimenting and building from Day 1.
              </p>
            </div>

            {/* Card 2: State-of-the-art environment – template layout: heading, paragraph, two-column list, green line */}
            <div
              className="rounded-2xl p-6 overflow-hidden"
              style={{
                backgroundColor: colors.backgroundCard,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div className="relative w-full aspect-video min-h-[200px] rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: colors.backgroundElevated }}>
                <Image src={WHY_IL_IMAGES.stateOfTheArt} alt="Access a state-of-the-art working environment" fill className="object-contain" sizes="(max-width: 1024px) 100vw, 50vw" />
              </div>
              <h4 className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                Access a state-of-the-art working environment
              </h4>
              <p className="text-sm leading-relaxed mb-3" style={{ color: colors.textMuted }}>
                Our Innovation Labs are built to replicate real industrial and enterprise environments, including:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mb-3 text-sm" style={{ color: colors.textMuted }}>
                {labEnvironmentBullets.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span style={{ color: accent }} className="shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm font-medium text-center" style={{ color: accent }}>
                A dedicated Experience Center for live demonstrations
              </p>
            </div>

            {/* Card 3: Reduce costs – same compact size as cards 1 & 2 */}
            <div
              className="rounded-2xl p-6 overflow-hidden"
              style={{
                backgroundColor: colors.backgroundCard,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div className="relative w-full aspect-video min-h-[200px] rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: colors.backgroundElevated }}>
                <Image src={WHY_IL_IMAGES.reduceCosts} alt="Reduce internal project setup costs and delays" fill className="object-contain" sizes="(max-width: 1024px) 100vw, 50vw" />
              </div>
              <h4 className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                Reduce internal project setup costs and delays
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                Innovation initiatives often get blocked by internal dependencies—budget cycles, procurement, multiple approvals, and cross-team coordination. ILaaS reduces those hurdles and helps you validate use cases faster before committing larger investments.
              </p>
            </div>

            {/* Card 4: Fill skill gaps – same compact size */}
            <div
              className="rounded-2xl p-6 overflow-hidden"
              style={{
                backgroundColor: colors.backgroundCard,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div className="relative w-full aspect-video min-h-[200px] rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: colors.backgroundElevated }}>
                <Image src={WHY_IL_IMAGES.fillSkillGaps} alt="Fill skill gaps instantly" fill className="object-contain" sizes="(max-width: 1024px) 100vw, 50vw" />
              </div>
              <h4 className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                Fill skill gaps instantly
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                Emerging tech PoCs require specialized skills that many teams don&apos;t have readily available—robotics, OT/IT integration, CV, AI, GenAI, edge, and cloud. We bring the expertise and execution capability so your teams can focus on business outcomes.
              </p>
            </div>
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

        {/* Lab Setup and Enablement Services – 4 cards top row, 3 bottom row; large illustrations */}
        <section className="min-h-screen flex flex-col justify-center max-w-6xl mx-auto px-8 py-16">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-4" style={{ color: colors.text }}>
            Lab Setup and <span style={{ color: accent }}>Enablement Services</span>
          </h3>
          <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: colors.textMuted }}>
            If your organization wants to build an internal innovation ecosystem, we can help you set up your own lab as well.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LAB_SETUP_ICONS.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 text-center"
                style={{
                  backgroundColor: colors.backgroundCard,
                  border: `1px solid ${colors.border}`,
                  boxShadow: `0 4px 20px ${colors.shadowMedium}`,
                }}
              >
                <div className="relative w-full aspect-[4/3] min-h-[160px] rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: colors.backgroundElevated }}>
                  <Image src={item.src} alt={item.label} fill className="object-contain p-3" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
                </div>
                <p className="text-sm font-medium leading-snug" style={{ color: colors.text }}>{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What We Enable – viewport 5 */}
        <section className="min-h-screen flex flex-col justify-center max-w-5xl mx-auto px-8 py-16">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-2" style={{ color: colors.text }}>
            What We <span style={{ color: accent }}>Enable</span>
          </h3>
          <p className="text-center mb-10" style={{ color: colors.textMuted }}>
            We help enterprises quickly build and validate:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {whatWeEnableTiles.map((tile, i) => (
              <div key={i} className="text-center">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ color: accent }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
                    {tile.icon}
                  </svg>
                </div>
                <h4 className="text-lg font-bold mb-1" style={{ color: colors.text }}>
                  {tile.title}
                </h4>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  {tile.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
