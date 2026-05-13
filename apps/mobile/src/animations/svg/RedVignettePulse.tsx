import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { RedVignetteShapeSvg } from "../../assets/svg";
import { svgMotion } from "../motionTokens";
import { decorativeViewAccessibilityProps } from "./decorativeProps";

interface RedVignettePulseProps {
  intensity?: "low" | "medium";
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
}

function RedVignettePulseBase({
  intensity = "low",
  durationMs = svgMotion.vignettePulseMs,
  style
}: RedVignettePulseProps) {
  const progress = useSharedValue(0);
  const maxOpacity = intensity === "medium" ? 0.42 : 0.35;

  useEffect(() => {
    progress.value = withSequence(
      withTiming(1, { duration: Math.round(durationMs * 0.45), easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: Math.round(durationMs * 0.55), easing: Easing.in(Easing.quad) })
    );
  }, [durationMs, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value * maxOpacity
  }));

  return (
    <Animated.View
      {...decorativeViewAccessibilityProps}
      style={[styles.wrap, animatedStyle, style]}
    >
      <RedVignetteShapeSvg width="100%" height="100%" preserveAspectRatio="none" />
    </Animated.View>
  );
}

export const RedVignettePulse = memo(RedVignettePulseBase);

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject
  }
});
