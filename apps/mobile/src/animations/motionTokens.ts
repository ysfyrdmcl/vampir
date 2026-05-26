export const EFFECT_DENSITY =
  process.env.EXPO_PUBLIC_EFFECT_DENSITY === "full" ? "full" : "reduced";

export const reducedEffects = EFFECT_DENSITY === "reduced";

export const svgMotion = {
  fadeInMs: 320,
  phaseHeroMs: 560,
  mistDriftMs: reducedEffects ? 22000 : 16000,
  batFlyMs: reducedEffects ? 5200 : 4200,
  bloodDropMs: reducedEffects ? 1200 : 1000,
  sealStampMs: 420,
  shieldPulseMs: 1100,
  sparkTwinkleMs: reducedEffects ? 1200 : 900,
  vignettePulseMs: reducedEffects ? 920 : 720,
  maxBats: reducedEffects ? 2 : 4,
  maxSparks: reducedEffects ? 4 : 8
} as const;
