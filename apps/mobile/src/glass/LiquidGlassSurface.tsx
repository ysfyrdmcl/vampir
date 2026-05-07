import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { useSpecularSweep } from "../motion";
import { glassTokens, type GlassDepth, type GlassIntensity, type GlassTone, type GlassVariant } from "./glass-tokens";

interface LiquidGlassSurfaceProps extends PropsWithChildren {
  animatedSheen?: boolean;
  animatedHighlightStyle?: StyleProp<ViewStyle>;
  ambientSweep?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  danger?: boolean;
  depth?: GlassDepth;
  disabled?: boolean;
  glow?: boolean;
  intensity?: GlassIntensity;
  radius?: number;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: GlassTone;
  variant?: GlassVariant;
}

export function LiquidGlassSurface({
  animatedSheen,
  animatedHighlightStyle,
  ambientSweep = false,
  children,
  contentStyle,
  danger = false,
  depth = "raised",
  disabled = false,
  glow = false,
  intensity = "medium",
  radius = glassTokens.radius.md,
  selected = false,
  style,
  tone,
  variant = "panel"
}: LiquidGlassSurfaceProps) {
  const token = glassTokens.variants[variant];
  const resolvedTone = tone ?? (danger || variant === "danger" ? "crimson" : variant === "gold" ? "gold" : selected ? "gold" : "obsidian");
  const toneToken = glassTokens.tone[resolvedTone];
  const intensityToken = glassTokens.intensity[intensity];
  const depthToken = glassTokens.depth[depth];
  const borderColor = danger ? glassTokens.edge.danger : selected ? token.borderActive : tone ? toneToken.edge : token.border;
  const fill = tone ? toneToken.fill : selected ? token.fillActive : token.fill;
  const sheen = tone ? toneToken.sheen : token.shine;
  const glowColor = danger ? glassTokens.shadow.crimsonGlow : selected ? glassTokens.shadow.selectedGlow : tone ? toneToken.glow : token.glow;
  const sweepStyle = useSpecularSweep({
    enabled: Boolean(animatedSheen ?? ambientSweep),
    durationMs: 2800,
    intensity: intensity === "strong" ? 0.24 : 0.16
  });

  return (
    <View
      style={[
        styles.root,
        {
          borderColor,
          borderRadius: radius,
          shadowColor: glowColor,
          shadowOpacity: disabled ? 0.06 : glow || selected || danger ? depthToken.shadowOpacity + 0.1 : depthToken.shadowOpacity,
          shadowRadius: glow || selected || danger ? depthToken.shadowRadius + 7 : depthToken.shadowRadius,
          elevation: depthToken.elevation,
          transform: [{ translateY: depthToken.translateY }]
        },
        disabled ? styles.disabled : null,
        style
      ]}
    >
      <BlurView intensity={Math.max(12, token.blur + intensityToken.blurBoost)} tint={token.tint} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
      <LinearGradient
        colors={[sheen, toneToken.tint, danger ? "rgba(255,70,80,0.09)" : "rgba(255,70,80,0.035)", "rgba(0,0,0,0.20)"]}
        locations={[0, 0.34, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[styles.highlight, { backgroundColor: sheen, opacity: 0.13 * intensityToken.highlight }, animatedHighlightStyle]} />
      {animatedSheen ?? ambientSweep ? (
        <Animated.View pointerEvents="none" style={[styles.sweep, sweepStyle]}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", danger ? "rgba(255,112,96,0.28)" : "rgba(255,219,150,0.22)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
      {selected || danger ? <View pointerEvents="none" style={[styles.selectedRing, { borderColor: danger ? glassTokens.edge.danger : token.borderActive }]} /> : null}
      <View pointerEvents="none" style={[styles.innerStroke, { borderColor: sheen }]} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "rgba(8,8,12,0.42)",
    shadowOffset: { width: 0, height: 10 },
    elevation: 5
  },
  content: {
    flex: 1
  },
  disabled: {
    opacity: 0.64
  },
  highlight: {
    position: "absolute",
    left: 1,
    right: 1,
    top: 1,
    height: "42%",
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    opacity: 0.13
  },
  sweep: {
    position: "absolute",
    top: -10,
    bottom: -10,
    left: "-45%",
    width: "48%",
    opacity: 0.2
  },
  selectedRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    opacity: 0.55
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.35
  }
});
