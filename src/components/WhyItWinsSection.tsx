"use client";

import Link from "next/link";
import { colors } from "@/config/theme";

export function WhyItWinsSection() {
  const benefits = [
    {
      title: "Plug & Play",
      desc: "Drop-in ready for any infrastructure",
      color: colors.primary,
    },
    {
      title: "Offline Ready",
      desc: "No data loss during outages",
      color: colors.orange,
    },
    {
      title: "ERP Ready",
      desc: "Seamless integration with COTS WMSs, ERPs, IT systems",
      color: colors.purple,
    },
    {
      title: "Agentic AI",
      desc: "Intelligence that talks and acts",
      color: colors.blue,
    },
  ];

  return (
    <section
      id="why-it-wins"
      className="relative z-10 min-h-screen flex items-center justify-center px-8 md:px-16 py-12"
    >
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Quote & Title */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div
                className="h-[2px] w-16"
                style={{ backgroundColor: colors.primary }}
              />
              <span
                className="text-sm font-medium tracking-wider uppercase"
                style={{ color: colors.primary }}
              >
                The Advantage
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5">
              Why It <span style={{ color: colors.primary }}>Wins</span>
            </h2>
            <blockquote
              className="text-xl md:text-2xl font-light italic leading-relaxed"
              style={{ color: colors.textMuted }}
            >
              &ldquo;Automate what bleeds money—not everything.&rdquo;
            </blockquote>
          </div>

          {/* Right - Benefits List */}
          <div className="space-y-4">
            {benefits.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl transition-all duration-300"
                style={{
                  backgroundColor: colors.backgroundCard,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <h3
                    className="text-base font-semibold mb-0.5"
                    style={{ color: item.color }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm" style={{ color: colors.textMuted }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA at the bottom */}
        <div className="mt-10 text-center">
          <Link href="/experiences">
            <button
              className="group inline-flex items-center gap-3 px-8 py-4 font-semibold rounded-full transition-all duration-300 text-base"
              style={{
                backgroundColor: colors.primary,
                color: colors.background,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.primaryHover;
                e.currentTarget.style.boxShadow = `0 0 40px ${colors.primaryMuted}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.primary;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span>Enter Experience Center</span>
              <svg
                className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </button>
          </Link>
        </div>

        {/* Footer content */}
        <div
          className="mt-12 text-sm flex items-center justify-between"
          style={{
            color: colors.textSubtle,
          }}
        >
          <span>© 2026 Intellobots</span>
          <span>ThingsX IoT Platform</span>
        </div>
      </div>
    </section>
  );
}
