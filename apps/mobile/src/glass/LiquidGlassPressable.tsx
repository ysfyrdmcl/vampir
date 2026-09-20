import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useKineticPress } from "../motion";
import { glassTokens, type GlassDepth, type GlassIntensity, type GlassTone, type GlassVariant } from "./glass-tokens";
import { LiquidGlassSurface } from "./LiquidGlassSurface";

interface LiquidGlassPressableProps extends PropsWithChildren, Omit<PressableProps, "children" | "style"> {
  ambientSweep?: boolean;
  animatedSheen?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  danger?: boolean;
  depth?: GlassDepth;
  disabled?: boolean;
  feedback?: "soft" | "strong" | "none";
  glow?: boolean;
  intensity?: GlassIntensity;
  radius?: number;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  surfaceStyle?: StyleProp<ViewStyle>;
  tone?: GlassTone;
  variant?: GlassVariant;
}

export function LiquidGlassPressable({
  ambientSweep = false,
  animatedSheen,
  children,
  contentStyle,
  danger,
  depth,
  disabled = false,
  feedback = "soft",
  glow,
  intensity,
  onPressIn,
  onPressOut,
  radius = glassTokens.radius.md,
  selected = false,
  style,
  surfaceStyle,
  tone,
  variant = "panel",
  ...props
}: LiquidGlassPressableProps) {
  const { animatedStyle, highlightStyle, pressHandlers, setSelected } = useKineticPress({
    disabled: disabled || feedback === "none",
    depth: feedback === "strong" ? "strong" : "soft"
  });

  useEffect(() => {
    setSelected(selected);
  }, [selected, setSelected]);

  return (
    <Pressable
      {...props}
      accessibilityRole={props.accessibilityRole ?? "button"}
      accessibilityState={{ ...props.accessibilityState, disabled }}
      disabled={disabled}
      onPressIn={(event) => {
        pressHandlers.onPressIn();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressHandlers.onPressOut();
        onPressOut?.(event);
      }}
      style={style}
    >
      <Animated.View style={[styles.animatedWrap, animatedStyle]}>
        <LiquidGlassSurface
          animatedSheen={animatedSheen}
          ambientSweep={ambientSweep}
          animatedHighlightStyle={highlightStyle}
          contentStyle={contentStyle}
          danger={danger}
          depth={depth}
          disabled={disabled}
          glow={glow}
          intensity={intensity}
          radius={radius}
          selected={selected}
          style={surfaceStyle}
          tone={tone}
          variant={variant}
        >
          {children}
        </LiquidGlassSurface>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  animatedWrap: {
    width: "100%"
  }
});
