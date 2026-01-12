/**
 * ThingsX Experience Center - Theme Configuration
 * Centralized color and styling tokens
 */

export const theme = {
  colors: {
    // Primary accent
    primary: "#00d4aa", // Teal/green
    primaryHover: "#00e6b8",
    primaryMuted: "rgba(0, 212, 170, 0.3)",
    primaryFaint: "rgba(0, 212, 170, 0.05)",

    // Background colors
    background: "#060608",
    backgroundCard: "#0a0a0c",
    backgroundElevated: "#0d0d10",

    // Text colors
    text: "#ffffff",
    textMuted: "#777777",
    textSubtle: "#666666",
    textFaint: "#444444",
    textDim: "#333333",

    // Border colors
    border: "#1a1a1a",
    borderSubtle: "#151515",

    // Accent colors
    orange: "#ff9f43",
    purple: "#5f27cd",
    blue: "#00d2d3",
    yellow: "#ffd700", // For sensors/endpoints

    // Star/constellation colors
    starBright: "#00d4aa",
    starDim: "#ffffff",

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
export const colors = theme.colors;

export default theme;
