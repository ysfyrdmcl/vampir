import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { ExecutionSealSvg } from "../../assets/svg";
import { useMotionEnabled } from "../../motion/MotionPreferences";
import { svgMotion } from "../motionTokens";
import { decorativeViewAccessibilityProps } from "./decorativeProps";

interface AnimatedSealProps {
  size?: number;
  delayMs?: number;
  tone?: "execution" | "death" | "neutral";
  style?: StyleProp<ViewStyle>;
}

function AnimatedSealBase({
  size = 132,
  delayMs = 0,
  style
}: AnimatedSealProps) {
  const motionEnabled = useMotionEnabled();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!motionEnabled) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delayMs,
      withSequence(
        withTiming(0.78, { duration: Math.round(svgMotion.sealStampMs * 0.48), easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: Math.round(svgMotion.sealStampMs * 0.52), easing: Easing.out(Easing.back(1.6)) })
      )
    );
    return () => cancelAnimation(progress);
  }, [delayMs, motionEnabled, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [
      { scale: 1.55 - progress.value * 0.55 },
      { rotate: `${-6 + progress.value * 6}deg` }
    ]
  }));

  return (
    <Animated.View
      {...decorativeViewAccessibilityProps}
      style={[styles.wrap, { width: size, height: size }, animatedStyle, style]}
    >
      <ExecutionSealSvg width="100%" height="100%" />
    </Animated.View>
  );
}

export const AnimatedSeal = memo(AnimatedSealBase);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  }
});
