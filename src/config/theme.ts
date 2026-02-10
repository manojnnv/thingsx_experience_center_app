/** ThingsX Experience Center - Theme Config*/

export const theme = {
  colors: {
    // Primary accent
    primary: "#00E676", // Green
    primaryHover: "#00ee7e",
    primaryMuted: "rgba(0, 230, 118, 0.3)",
    primaryFaint: "rgba(0, 230, 118, 0.05)",

    // Background colors
    background: "#060608",
    backgroundCard: "#0a0a0c",
    backgroundElevated: "#0d0d10",

    // Text colors
    text: " #ffffff",
    textMuted: " #ffffff",
    textSubtle: " #ffffff",
    textFaint: " #ffffff",
    textDim: " #ffffff",

    // Border colors
    border: " #1a1a1a",
    borderSubtle: " #151515",

    // Accent colors
    orange: "#00E676",
    purple: "#00E676",
    blue: "#00E676",
    yellow: "#00E676",

    // Experience-specific accent colors
    sensorAccent: "#00E676", // Green for Sensors & Endnodes
    retailAccent: "#00E676", // Green for Retail Experience
    retailAccentHover: "#00ee7e",
    retailAccentMuted: "rgba(0, 230, 118, 0.3)",
    retailAccentFaint: "rgba(0, 230, 118, 0.05)",
    warehouseAccent: "#00E676", // Green for Warehouse Experience
    innovationLabAccent: "#00E676", // Green for Innovation Lab

    // Star/constellation colors
    starBright: " #00E676",
    starDim: " #ffffff",

    // Shadow colors
    shadowDark: "rgba(0, 0, 0, 0.4)",
    shadowMedium: "rgba(0, 0, 0, 0.2)",
    shadowLight: "rgba(0, 0, 0, 0.1)",

    // Utility colors
    transparent: "transparent",
  },

  // Opacity values
  opacity: {
    full: 1,
    high: 0.9,
    medium: 0.6,
    low: 0.4,
    subtle: 0.15,
    faint: 0.08,
    minimal: 0.05,
  },

  // Animation durations (ms)
  animation: {
    fast: 300,
    normal: 500,
    slow: 800,
    verySlow: 2500,
  },

  // Spacing scale (for reference)
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
    "4xl": "5rem",
  },
} as const;

// Type exports for TypeScript support
export type ThemeColors = typeof theme.colors;
export type ThemeOpacity = typeof theme.opacity;
export type Theme = typeof theme;

// Convenience export for colors
export const { colors } = theme;

export default theme;
