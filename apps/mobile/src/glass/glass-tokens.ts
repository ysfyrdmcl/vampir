import { colors } from "../theme/colors";

export type GlassVariant =
  | "panel"
  | "hero"
  | "low"
  | "button"
  | "chip"
  | "nav"
  | "danger"
  | "gold"
  | "parchment"
  | "selected"
  | "ghost";

export type GlassTone = "obsidian" | "crimson" | "gold" | "emerald" | "purple";
export type GlassIntensity = "subtle" | "medium" | "strong";
export type GlassDepth = "flat" | "raised" | "floating";

export const glassTokens = {
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    pill: 999
  },
  blur: {
    soft: 26,
    medium: 44,
    strong: 68,
    low: 26,
    high: 68
  },
  fill: {
    obsidian: "rgba(8,8,12,0.56)",
    panel: "rgba(18,16,20,0.48)",
    elevated: "rgba(28,24,30,0.42)",
    selected: "rgba(90,24,28,0.38)",
    gold: "rgba(185,142,48,0.18)",
    danger: "rgba(120,18,24,0.28)"
  },
  edge: {
    subtle: "rgba(255,232,178,0.12)",
    gold: "rgba(234,194,86,0.48)",
    goldStrong: "rgba(255,213,92,0.72)",
    crimson: "rgba(166,34,42,0.54)",
    danger: "rgba(220,55,65,0.68)"
  },
  highlight: {
    topSheen: "rgba(255,255,255,0.14)",
    warmSheen: "rgba(255,219,150,0.16)",
    crimsonSheen: "rgba(255,70,80,0.12)"
  },
  shadow: {
    floatingDark: "rgba(0,0,0,0.82)",
    warmGlow: "rgba(234,194,86,0.32)",
    crimsonGlow: "rgba(181,38,25,0.34)",
    selectedGlow: "rgba(255,213,92,0.34)"
  },
  tone: {
    obsidian: {
      fill: "rgba(8,8,12,0.56)",
      tint: "rgba(255,232,178,0.08)",
      edge: "rgba(255,232,178,0.14)",
      glow: "rgba(234,194,86,0.18)",
      sheen: "rgba(255,232,178,0.12)"
    },
    crimson: {
      fill: "rgba(54,12,15,0.52)",
      tint: "rgba(181,38,25,0.18)",
      edge: "rgba(220,55,65,0.50)",
      glow: "rgba(181,38,25,0.38)",
      sheen: "rgba(255,70,80,0.14)"
    },
    gold: {
      fill: "rgba(38,28,18,0.54)",
      tint: "rgba(234,194,86,0.18)",
      edge: "rgba(234,194,86,0.52)",
      glow: "rgba(234,194,86,0.34)",
      sheen: "rgba(255,219,150,0.18)"
    },
    emerald: {
      fill: "rgba(10,31,20,0.50)",
      tint: "rgba(39,190,104,0.14)",
      edge: "rgba(39,190,104,0.42)",
      glow: "rgba(39,190,104,0.26)",
      sheen: "rgba(150,255,188,0.12)"
    },
    purple: {
      fill: "rgba(20,15,32,0.52)",
      tint: "rgba(130,86,210,0.14)",
      edge: "rgba(169,123,255,0.38)",
      glow: "rgba(130,86,210,0.26)",
      sheen: "rgba(205,180,255,0.12)"
    }
  },
  intensity: {
    subtle: { blurBoost: -10, fillAlpha: 0.78, highlight: 0.7 },
    medium: { blurBoost: 0, fillAlpha: 1, highlight: 1 },
    strong: { blurBoost: 14, fillAlpha: 1.14, highlight: 1.28 }
  },
  depth: {
    flat: { shadowOpacity: 0.1, shadowRadius: 8, elevation: 2, translateY: 0 },
    raised: { shadowOpacity: 0.18, shadowRadius: 15, elevation: 5, translateY: 0 },
    floating: { shadowOpacity: 0.3, shadowRadius: 24, elevation: 10, translateY: -1 }
  },
  variants: {
    panel: {
      tint: "dark" as const,
      blur: 44,
      border: "rgba(255,232,178,0.14)",
      borderActive: "rgba(233,195,73,0.48)",
      fill: "rgba(18,16,20,0.50)",
      fillActive: "rgba(90,24,28,0.34)",
      shine: "rgba(255,219,150,0.12)",
      glow: "rgba(234,194,86,0.24)",
      text: colors.text,
      textActive: colors.secondary
    },
    hero: {
      tint: "dark" as const,
      blur: 62,
      border: "rgba(255,232,178,0.18)",
      borderActive: "rgba(233,195,73,0.58)",
      fill: "rgba(8,8,12,0.56)",
      fillActive: "rgba(78,22,25,0.42)",
      shine: "rgba(255,219,150,0.16)",
      glow: "rgba(234,194,86,0.3)",
      text: colors.text,
      textActive: colors.secondary
    },
    low: {
      tint: "dark" as const,
      blur: 26,
      border: "rgba(255,232,178,0.10)",
      borderActive: "rgba(234,194,86,0.28)",
      fill: "rgba(8,8,12,0.38)",
      fillActive: "rgba(28,24,30,0.36)",
      shine: "rgba(255,255,255,0.07)",
      glow: "rgba(0,0,0,0.5)",
      text: colors.textMuted,
      textActive: colors.secondary
    },
    button: {
      tint: "dark" as const,
      blur: 58,
      border: "rgba(234,194,86,0.34)",
      borderActive: "rgba(255,213,92,0.72)",
      fill: "rgba(90,24,28,0.38)",
      fillActive: "rgba(120,18,24,0.42)",
      shine: "rgba(255,219,150,0.14)",
      glow: "rgba(181,38,25,0.36)",
      text: colors.text,
      textActive: colors.text
    },
    chip: {
      tint: "dark" as const,
      blur: 38,
      border: "rgba(255,232,178,0.14)",
      borderActive: "rgba(234,194,86,0.56)",
      fill: "rgba(8,8,12,0.46)",
      fillActive: "rgba(90,24,28,0.34)",
      shine: "rgba(255,219,150,0.11)",
      glow: "rgba(234,194,86,0.24)",
      text: colors.textMuted,
      textActive: colors.secondary
    },
    nav: {
      tint: "dark" as const,
      blur: 70,
      border: "rgba(255,232,178,0.14)",
      borderActive: "rgba(234,194,86,0.62)",
      fill: "rgba(8,8,12,0.62)",
      fillActive: "rgba(90,24,28,0.34)",
      shine: "rgba(255,219,150,0.12)",
      glow: "rgba(234,194,86,0.3)",
      text: "#8f8d92",
      textActive: colors.secondary
    },
    danger: {
      tint: "dark" as const,
      blur: 54,
      border: "rgba(220,55,65,0.48)",
      borderActive: "rgba(220,55,65,0.68)",
      fill: "rgba(54,12,15,0.46)",
      fillActive: "rgba(120,18,24,0.36)",
      shine: "rgba(255,70,80,0.11)",
      glow: "rgba(181,38,25,0.3)",
      text: "#f7d7d3",
      textActive: "#ffe0dc"
    },
    gold: {
      tint: "dark" as const,
      blur: 52,
      border: "rgba(234,194,86,0.52)",
      borderActive: "rgba(255,213,92,0.72)",
      fill: "rgba(185,142,48,0.18)",
      fillActive: "rgba(185,142,48,0.24)",
      shine: "rgba(255,219,150,0.16)",
      glow: "rgba(234,194,86,0.34)",
      text: colors.secondary,
      textActive: colors.secondary
    },
    parchment: {
      tint: "dark" as const,
      blur: 36,
      border: "rgba(234,194,86,0.28)",
      borderActive: "rgba(181,38,25,0.62)",
      fill: "rgba(38,28,18,0.50)",
      fillActive: "rgba(56,35,18,0.56)",
      shine: "rgba(255,219,150,0.12)",
      glow: "rgba(181,38,25,0.24)",
      text: colors.text,
      textActive: colors.secondary
    },
    selected: {
      tint: "dark" as const,
      blur: 56,
      border: "rgba(234,194,86,0.58)",
      borderActive: "rgba(255,213,92,0.72)",
      fill: "rgba(90,24,28,0.38)",
      fillActive: "rgba(90,24,28,0.44)",
      shine: "rgba(255,219,150,0.16)",
      glow: "rgba(255,213,92,0.34)",
      text: colors.secondary,
      textActive: colors.secondary
    },
    ghost: {
      tint: "dark" as const,
      blur: 28,
      border: "rgba(255,232,178,0.10)",
      borderActive: "rgba(234,194,86,0.30)",
      fill: "rgba(8,8,12,0.26)",
      fillActive: "rgba(28,24,30,0.30)",
      shine: "rgba(255,255,255,0.05)",
      glow: "rgba(0,0,0,0.46)",
      text: colors.textMuted,
      textActive: colors.secondary
    }
  }
} as const;
