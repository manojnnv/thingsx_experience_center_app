"use client";

import { colors } from "@/config/theme";

export function ArchitectureDiagram() {
  return (
    <div className="relative w-full h-full flex justify-center">
      <div className="relative w-full max-w-6xl flex items-center">
        <svg
          viewBox="0 0 650 560"
          className="w-full max-w-4xl h-full mx-auto"
          style={{ maxHeight: "100%" }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Main Arc - Large dashed semi-circle wrapping around */}
          <path
            className="diagram-arc"
            d="M 50 50
               A 265 265 0 1 1 50 510"
            fill="none"
            stroke={colors.primary}
            strokeWidth="2"
            strokeDasharray="10 6"
            style={{ opacity: 0.6 }}
          />

          {/* ThingsX Console - Monitor with bar chart and gauges */}
          <g className="diagram-console">
            <rect
              x="60"
              y="220"
              width="60"
              height="75"
              rx="6"
              fill={colors.backgroundCard}
              stroke={colors.primary}
              strokeWidth="2"
            />
            <rect
              x="68"
              y="228"
              width="44"
              height="28"
              rx="2"
              fill={colors.backgroundCard}
              stroke={colors.primary}
              strokeWidth="1.5"
            />
            <rect x="72" y="248" width="7" height="12" fill={colors.primary} rx="1" />
            <rect x="84" y="238" width="7" height="20" fill={colors.orange} rx="1" />
            <rect x="96" y="243" width="7" height="15" fill={colors.primary} rx="1" />
            <circle cx="80" cy="272" r="6" fill="none" stroke={colors.orange} strokeWidth="1.5" />
            <circle cx="100" cy="272" r="6" fill="none" stroke={colors.primary} strokeWidth="1.5" />
            <rect x="82" y="288" width="16" height="4" rx="2" fill={colors.primary} opacity="0.6" />
            <text x="90" y="310" textAnchor="middle" fill={colors.text} fontSize="10" fontWeight="600">
              ThingsX Console
            </text>
          </g>

          {/* Three Gateways - Stacked vertically */}
          {[
            { x: 170, y: 100 },
            { x: 240, y: 260 },
            { x: 170, y: 400 },
          ].map((gw, i) => (
            <g key={i} className="diagram-gateway">
              <rect
                x={gw.x - 22}
                y={gw.y - 22}
                width="44"
                height="44"
                rx="5"
                fill={colors.backgroundCard}
                stroke={colors.orange}
                strokeWidth="2"
              />
              <rect x={gw.x - 10} y={gw.y - 8} width="20" height="2.5" fill={colors.orange} rx="1" />
              <rect x={gw.x - 10} y={gw.y - 1} width="20" height="2.5" fill={colors.orange} rx="1" />
              <rect x={gw.x - 10} y={gw.y + 6} width="20" height="2.5" fill={colors.orange} rx="1" />
              <line
                x1="120"
                y1="260"
                x2={gw.x - 22}
                y2={gw.y}
                stroke={colors.text}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x={gw.x} y={gw.y + 38} textAnchor="middle" fill={colors.text} fontSize="10">
                Gateway
              </text>
            </g>
          ))}

          {/* Endpoints/Sensors - 2 per Gateway (cloud icons) */}
          {[
            { gatewayIdx: 0, x: 300, y: 70 },
            { gatewayIdx: 0, x: 320, y: 130 },
            { gatewayIdx: 1, x: 360, y: 230 },
            { gatewayIdx: 1, x: 380, y: 290 },
            { gatewayIdx: 2, x: 300, y: 370 },
            { gatewayIdx: 2, x: 320, y: 430 },
          ].map((sensor, i) => {
            const gateway = [
              { x: 170, y: 100 },
              { x: 240, y: 260 },
              { x: 170, y: 400 },
            ][sensor.gatewayIdx];
            return (
              <g key={i} className="diagram-sensor">
                <line
                  x1={gateway.x + 22}
                  y1={gateway.y}
                  x2={sensor.x}
                  y2={sensor.y}
                  stroke={colors.text}
                  strokeWidth="1.5"
                />
                <ellipse cx={sensor.x} cy={sensor.y - 3} rx="14" ry="9" fill={colors.backgroundCard} stroke={colors.yellow} strokeWidth="1.5" />
                <ellipse cx={sensor.x - 7} cy={sensor.y + 1} rx="7" ry="5" fill={colors.backgroundCard} stroke={colors.yellow} strokeWidth="1.5" />
                <ellipse cx={sensor.x + 7} cy={sensor.y + 1} rx="7" ry="5" fill={colors.backgroundCard} stroke={colors.yellow} strokeWidth="1.5" />
                <path
                  d={`M ${sensor.x - 5} ${sensor.y + 10} Q ${sensor.x} ${sensor.y + 7}, ${sensor.x + 5} ${sensor.y + 10}`}
                  fill="none"
                  stroke={colors.yellow}
                  strokeWidth="1.2"
                  opacity="0.8"
                />
                <path
                  d={`M ${sensor.x - 7} ${sensor.y + 14} Q ${sensor.x} ${sensor.y + 9}, ${sensor.x + 7} ${sensor.y + 14}`}
                  fill="none"
                  stroke={colors.yellow}
                  strokeWidth="1.2"
                  opacity="0.6"
                />
                <text x={sensor.x} y={sensor.y + 28} textAnchor="middle" fill={colors.text} fontSize="9">
                  Endpoints/Sensors
                </text>
              </g>
            );
          })}

          {/* Peripherals along the arc */}
          {[
            { x: 380, y: 40, type: "temperature" },
            { x: 480, y: 120, type: "ai" },
            { x: 520, y: 220, type: "humidity" },
            { x: 520, y: 320, type: "camera" },
            { x: 480, y: 420, type: "wifi" },
            { x: 380, y: 500, type: "bluetooth" },
          ].map((peripheral, i) => (
            <g key={i} className="diagram-peripheral">
              {peripheral.type === "temperature" && (
                <>
                  <circle cx={peripheral.x} cy={peripheral.y} r="14" fill={colors.backgroundCard} stroke={colors.primary} strokeWidth="1.5" />
                  <text x={peripheral.x} y={peripheral.y + 4} textAnchor="middle" fill={colors.primary} fontSize="13" fontWeight="bold">°C</text>
                </>
              )}
              {peripheral.type === "ai" && (
                <>
                  <circle cx={peripheral.x} cy={peripheral.y} r="16" fill={colors.backgroundCard} stroke={colors.primary} strokeWidth="1.5" />
                  <path
                    d={`M ${peripheral.x} ${peripheral.y - 7} Q ${peripheral.x + 6} ${peripheral.y - 3}, ${peripheral.x + 5} ${peripheral.y + 3} L ${peripheral.x - 5} ${peripheral.y + 3} Q ${peripheral.x - 6} ${peripheral.y - 3}, ${peripheral.x} ${peripheral.y - 7} Z`}
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth="1.5"
                  />
                  <line x1={peripheral.x - 3} y1={peripheral.y + 6} x2={peripheral.x + 3} y2={peripheral.y + 6} stroke={colors.primary} strokeWidth="1.5" />
                </>
              )}
              {peripheral.type === "humidity" && (
                <>
                  <circle cx={peripheral.x} cy={peripheral.y} r="14" fill={colors.backgroundCard} stroke={colors.primary} strokeWidth="1.5" />
                  <text x={peripheral.x} y={peripheral.y + 4} textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="bold">%</text>
                </>
              )}
              {peripheral.type === "camera" && (
                <>
                  <circle cx={peripheral.x} cy={peripheral.y} r="15" fill={colors.backgroundCard} stroke={colors.primary} strokeWidth="1.5" />
                  <circle cx={peripheral.x} cy={peripheral.y} r="8" fill="none" stroke={colors.primary} strokeWidth="1.5" />
                  <circle cx={peripheral.x} cy={peripheral.y} r="4" fill={colors.primary} opacity="0.4" />
                </>
              )}
              {peripheral.type === "wifi" && (
                <>
                  <circle cx={peripheral.x} cy={peripheral.y} r="16" fill={colors.backgroundCard} stroke={colors.primary} strokeWidth="1.5" />
                  <path
                    d={`M ${peripheral.x - 9} ${peripheral.y - 1} Q ${peripheral.x} ${peripheral.y - 9}, ${peripheral.x + 9} ${peripheral.y - 1}`}
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth="1.5"
                  />
                  <path
                    d={`M ${peripheral.x - 5} ${peripheral.y + 3} Q ${peripheral.x} ${peripheral.y - 2}, ${peripheral.x + 5} ${peripheral.y + 3}`}
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth="1.5"
                  />
                  <circle cx={peripheral.x} cy={peripheral.y + 6} r="2" fill={colors.primary} />
                </>
              )}
              {peripheral.type === "bluetooth" && (
                <>
                  <circle cx={peripheral.x} cy={peripheral.y} r="14" fill={colors.backgroundCard} stroke={colors.blue} strokeWidth="1.5" />
                  <path
                    d={`M ${peripheral.x} ${peripheral.y - 7} L ${peripheral.x + 4} ${peripheral.y - 3} L ${peripheral.x} ${peripheral.y + 1} L ${peripheral.x + 4} ${peripheral.y + 5} L ${peripheral.x} ${peripheral.y + 1} L ${peripheral.x - 4} ${peripheral.y + 5} M ${peripheral.x} ${peripheral.y - 7} L ${peripheral.x - 4} ${peripheral.y - 3}`}
                    fill="none"
                    stroke={colors.blue}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
            </g>
          ))}
        </svg>

        {/* Component Definitions - Right side of diagram */}
        <div className="absolute right-0 top-0 h-full hidden lg:flex flex-col justify-between py-8" style={{ width: "280px" }}>
          <div className="diagram-label">
            <h4 className="text-sm font-semibold mb-1" style={{ color: colors.primary }}>
              AI Satellites
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>
              Edge Vision for Real time
            </p>
            <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>
              Insights, navigations
            </p>
          </div>

          <div className="diagram-label">
            <h4 className="text-sm font-semibold mb-1" style={{ color: colors.primary }}>
              Endpoints/Sensors
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>
              Sense Monitor and control
            </p>
            <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>
              industrial equipment's and
            </p>
            <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>
              environment
            </p>
          </div>

          <div className="diagram-label">
            <h4 className="text-sm font-semibold mb-1" style={{ color: colors.primary }}>
              Gateway
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>
              Bridging protocols,
            </p>
            <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>
              Enabling Communication
            </p>
          </div>

          <div className="diagram-label">
            <h4 className="text-sm font-semibold mb-1" style={{ color: colors.primary }}>
              ThingsX Console:
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>
              Unified hub for Device Control,
            </p>
            <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>
              & automation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
