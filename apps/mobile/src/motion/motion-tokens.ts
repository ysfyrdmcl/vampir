import { Easing } from "react-native-reanimated";

export const motionTokens = {
  duration: {
    instant: 90,
    fast: 160,
    regular: 260,
    slow: 520,
    ambient: 1600,
    sweepMin: 1800,
    sweepMax: 3200,
    screenEntranceMin: 280,
    screenEntranceMax: 420
  },
  scale: {
    press: 0.97,
    glassPress: 0.985,
    lift: 1.02,
    selected: 1.02
  },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    entrance: Easing.out(Easing.cubic),
    exit: Easing.in(Easing.cubic)
  },
  spring: {
    press: {
      damping: 18,
      stiffness: 260,
      mass: 0.72
    },
    settle: {
      damping: 16,
      stiffness: 210,
      mass: 0.82
    },
    glass: {
      damping: 20,
      stiffness: 240,
      mass: 0.78
    }
  }
} as const;
