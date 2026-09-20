import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { RedVignetteShapeSvg } from "../../assets/svg";
import { useMotionEnabled } from "../../motion/MotionPreferences";
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
  const motionEnabled = useMotionEnabled();
  const progress = useSharedValue(0);
  const maxOpacity = intensity === "medium" ? 0.32 : 0.24;

  useEffect(() => {
    if (!motionEnabled) {
      progress.value = 0;
      return;
    }
    progress.value = withSequence(
      withTiming(1, { duration: Math.round(durationMs * 0.45), easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: Math.round(durationMs * 0.55), easing: Easing.in(Easing.quad) })
    );
    return () => cancelAnimation(progress);
  }, [durationMs, motionEnabled, progress]);

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
    ...StyleSheet.absoluteFill
  }
});
