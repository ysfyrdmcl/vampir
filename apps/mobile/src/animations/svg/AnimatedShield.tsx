import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { ShieldGlowSvg } from "../../assets/svg";
import { svgMotion } from "../motionTokens";
import { decorativeViewAccessibilityProps } from "./decorativeProps";

interface AnimatedShieldProps {
  size?: number;
  pulse?: boolean;
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
}

function AnimatedShieldBase({
  size = 180,
  pulse = false,
  durationMs = svgMotion.shieldPulseMs,
  style
}: AnimatedShieldProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const animation = withSequence(
      withTiming(1, { duration: Math.round(durationMs * 0.5), easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: Math.round(durationMs * 0.5), easing: Easing.in(Easing.quad) })
    );
    progress.value = pulse ? withRepeat(animation, -1, false) : animation;
  }, [durationMs, progress, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.7,
    transform: [{ scale: 0.92 + progress.value * 0.14 }]
  }));

  return (
    <Animated.View
      {...decorativeViewAccessibilityProps}
      style={[styles.wrap, { width: size, height: size }, animatedStyle, style]}
    >
      <ShieldGlowSvg width="100%" height="100%" />
    </Animated.View>
  );
}

export const AnimatedShield = memo(AnimatedShieldBase);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  }
});
