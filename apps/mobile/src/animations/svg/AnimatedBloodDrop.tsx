import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { BloodDropSvg } from "../../assets/svg";
import { svgMotion } from "../motionTokens";
import { decorativeViewAccessibilityProps } from "./decorativeProps";

interface AnimatedBloodDropProps {
  size?: number;
  delayMs?: number;
  durationMs?: number;
  x?: number;
  y?: number;
  style?: StyleProp<ViewStyle>;
}

function AnimatedBloodDropBase({
  size = 22,
  delayMs = 0,
  durationMs = svgMotion.bloodDropMs,
  x = 0,
  y = 0,
  style
}: AnimatedBloodDropProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withSequence(
        withTiming(1, { duration: Math.round(durationMs * 0.55), easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: Math.round(durationMs * 0.45), easing: Easing.in(Easing.quad) })
      )
    );
  }, [delayMs, durationMs, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.45,
    transform: [{ translateY: y + progress.value * 34 }, { scale: 0.8 + progress.value * 0.2 }]
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
