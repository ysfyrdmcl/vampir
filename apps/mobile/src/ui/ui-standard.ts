import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export const uiStandard = {
  screen: {
    pageGap: spacing.lg,
    sectionGap: spacing.lg,
    cardRadius: 18,
    panelRadius: 16,
    chipRadius: 12,
    inputHeight: 56,
    compactInputHeight: 44,
    codeSlotHeight: 62,
    codeSlotRadius: 8,
    heroBadgeSize: 72,
    heroBadgeRadius: 36,
    pagePadding: spacing.safe,
    cardPaddingX: spacing.lg,
    cardPaddingY: 30
  },
  card: {
    radius: 14,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    backgroundColor: "rgba(18,19,21,0.84)"
  },
  text: {
    heroTitleSize: 42,
    heroSubtitleSize: 18,
    sectionLabelSize: typography.label,
    labelSpacing: 2
  },
  motion: {
    contentFadeMs: 340,
    contentRiseMs: 380,
    contentRiseDistance: 14,
    backdropLoopMs: 14000,
    backdropLoopScale: 1.04,
    buttonPressScale: 0.97,
    buttonPressInSpeed: 30,
    buttonPressOutSpeed: 26,
    phaseTransitionMs: 900,
    cardRevealMs: 650,
    cardSelectMs: 180,
    pulseSlowMs: 2200,
    countdownWarningMs: 10000
  },
  button: {
    height: 56,
    compactHeight: 48,
    radius: 12,
    iconSize: 21,
    compactIconSize: 18,
    labelSize: 18,
    compactLabelSize: 14,
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffsetY: 7
  },
  actionDock: {
    minHeight: 64,
    bottomGap: spacing.sm,
    scrollGap: spacing.lg,
    paddingX: 10,
    paddingY: 8
  },
  fx: {
    glowSoft: 0.18,
    glowMedium: 0.32,
    glowStrong: 0.48,
    overlayDark: 0.62,
    textureOpacity: 0.08
  },
  buttonVariants: {
    primary: {
      gradient: ["#b52619", "#8b0000"] as const,
      border: "rgba(170,137,132,0.28)",
      text: colors.text
    },
    secondary: {
      gradient: ["#3a3939", "#2a2a2a"] as const,
      border: "rgba(170,137,132,0.28)",
      text: "#dfdfdf"
    },
    destructive: {
      gradient: ["#7f1616", "#4a0707"] as const,
      border: "rgba(255,143,130,0.4)",
      text: "#f7d7d3"
    },
    blood: {
      gradient: ["#b52619", "#8b0000"] as const,
      border: "rgba(170,137,132,0.28)",
      text: colors.text
    },
    charcoal: {
      gradient: ["#3a3939", "#2a2a2a"] as const,
      border: "rgba(170,137,132,0.28)",
      text: "#dfdfdf"
    },
    outline: {
      gradient: ["rgba(13,13,13,0.86)", "rgba(13,13,13,0.86)"] as const,
      border: "rgba(170,137,132,0.45)",
      text: colors.text
    },
    gold: {
      gradient: ["#d5a932", "#9f7612"] as const,
      border: "rgba(233,195,73,0.46)",
      text: "#2f2206"
    },
    danger: {
      gradient: ["#7f1616", "#4a0707"] as const,
      border: "rgba(255,143,130,0.4)",
      text: "#f7d7d3"
    },
    dangerOutline: {
      gradient: ["rgba(31,13,14,0.5)", "rgba(20,16,17,0.56)"] as const,
      border: "rgba(255,143,130,0.34)",
      text: "#f0b5ad"
    },
    ghost: {
      gradient: ["rgba(17,17,19,0.38)", "rgba(17,17,19,0.38)"] as const,
      border: "rgba(170,137,132,0.22)",
      text: "#cbc2bc"
    },
    parchment: {
      gradient: ["#f1e5d3", "#dbcbb3"] as const,
      border: "rgba(170,137,132,0.5)",
      text: "#372f23"
    },
    locked: {
      gradient: ["rgba(63,63,67,0.9)", "rgba(43,43,47,0.9)"] as const,
      border: "rgba(125,125,125,0.44)",
      text: "#b7b7bc"
    }
  },
  logTones: {
    phase: {
      border: "rgba(88,193,182,0.32)",
      background: "rgba(8,22,24,0.78)",
      text: "#58c1b6"
    },
    vote: {
      border: "rgba(233,195,73,0.32)",
      background: "rgba(33,29,16,0.72)",
      text: colors.secondary
    },
    result: {
      border: "rgba(196,35,35,0.36)",
      background: "rgba(35,12,13,0.76)",
      text: colors.primaryBright
    },
    private: {
      border: "rgba(169,123,255,0.32)",
      background: "rgba(22,16,34,0.76)",
      text: "#a97bff"
    },
    warning: {
      border: "rgba(255,143,130,0.36)",
      background: "rgba(38,18,14,0.76)",
      text: colors.danger
    }
  },
  phaseTheme: {
    home: { accent: "rgba(78,102,156,0.22)", atmosphere: "rgba(139,0,0,0.2)" },
    create: { accent: "rgba(233,195,73,0.2)", atmosphere: "rgba(67,45,13,0.22)" },
    join: { accent: "rgba(233,195,73,0.2)", atmosphere: "rgba(67,45,13,0.22)" },
    lobby: { accent: "rgba(225,188,84,0.22)", atmosphere: "rgba(61,49,25,0.22)" },
    role: { accent: "rgba(130,74,170,0.24)", atmosphere: "rgba(62,25,25,0.2)" },
    night: { accent: "rgba(61,78,129,0.22)", atmosphere: "rgba(74,13,13,0.18)" },
    vampire: { accent: "rgba(139,0,0,0.3)", atmosphere: "rgba(109,9,9,0.2)" },
    detective: { accent: "rgba(207,161,65,0.26)", atmosphere: "rgba(69,49,9,0.22)" },
    doctor: { accent: "rgba(89,168,153,0.2)", atmosphere: "rgba(33,59,52,0.2)" },
    day: { accent: "rgba(205,182,126,0.2)", atmosphere: "rgba(56,49,30,0.2)" },
    vote: { accent: "rgba(173,40,40,0.26)", atmosphere: "rgba(86,26,18,0.2)" },
    tie: { accent: "rgba(188,93,48,0.24)", atmosphere: "rgba(85,31,11,0.2)" },
    result: { accent: "rgba(180,120,68,0.2)", atmosphere: "rgba(80,31,23,0.2)" },
    gameover: { accent: "rgba(138,79,47,0.2)", atmosphere: "rgba(70,28,15,0.2)" },
    splash: { accent: "rgba(108,27,27,0.2)", atmosphere: "rgba(57,17,17,0.2)" }
  },
  surfaces: {
    hero: {
      borderColor: "rgba(170,137,132,0.36)",
      backgroundColor: colors.surfaceGlass
    },
    panel: {
      borderColor: "rgba(170,137,132,0.22)",
      backgroundColor: colors.surfaceGlass
    },
    parchment: {
      borderColor: "rgba(170,137,132,0.42)",
      backgroundColor: colors.parchment
    },
    code: {
      borderColor: "rgba(170,137,132,0.32)",
      backgroundColor: "rgba(32,31,31,0.92)"
    }
  }
} as const;
