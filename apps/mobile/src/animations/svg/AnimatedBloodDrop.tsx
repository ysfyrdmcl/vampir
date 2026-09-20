import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { BloodDropSvg } from "../../assets/svg";
import { useMotionEnabled } from "../../motion/MotionPreferences";
import { svgMotion } from "../motionTokens";
import { decorativeViewAccessibilityProps } from "./decorativeProps";

interface AnimatedBloodDropProps {
  size?: number;
  delayMs?: number;
  durationMs?: number;
  loop?: boolean;
  x?: number;
  y?: number;
  style?: StyleProp<ViewStyle>;
}

function AnimatedBloodDropBase({
  size = 22,
  delayMs = 0,
  durationMs = svgMotion.bloodDropMs,
  loop = false,
  x = 0,
  y = 0,
  style
}: AnimatedBloodDropProps) {
  const motionEnabled = useMotionEnabled();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!motionEnabled) {
      progress.value = 0;
      return;
    }
    const animation = withSequence(
      withTiming(1, { duration: Math.round(durationMs * 0.72), easing: Easing.in(Easing.cubic) }),
      withTiming(0, { duration: Math.round(durationMs * 0.28), easing: Easing.out(Easing.quad) })
    );
    progress.value = withDelay(
      delayMs,
      loop ? withRepeat(animation, -1, false) : animation
    );
    return () => cancelAnimation(progress);
  }, [delayMs, durationMs, loop, motionEnabled, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.14, 0.78, 1], [0, 0.74, 0.68, 0]),
    transform: [
      { translateX: interpolate(progress.value, [0, 0.45, 1], [0, size * 0.08, -size * 0.04]) },
      { translateY: interpolate(progress.value, [0, 1], [0, size * 1.8]) },
      { scaleX: interpolate(progress.value, [0, 0.36, 1], [0.86, 0.94, 0.82]) },
      { scaleY: interpolate(progress.value, [0, 0.5, 1], [0.92, 1.18, 1.04]) }
    ]
  }));

  return (
    <Animated.View
      {...decorativeViewAccessibilityProps}
      style={[styles.wrap, { width: size, height: size, left: x, top: y }, animatedStyle, style]}
    >
      <BloodDropSvg width="100%" height="100%" />
    </Animated.View>
  );
}

export const AnimatedBloodDrop = memo(AnimatedBloodDropBase);

const styles = StyleSheet.create({
  wrap: {
    position: "absolute"
  }
});
