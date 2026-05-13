import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { CandleFlameSvg } from "../../assets/svg";
import { decorativeViewAccessibilityProps } from "./decorativeProps";

interface AnimatedCandleFlameProps {
  mode?: "flicker" | "extinguish";
  size?: number;
  delayMs?: number;
  style?: StyleProp<ViewStyle>;
}

function AnimatedCandleFlameBase({
  mode = "flicker",
  size = 34,
  delayMs = 0,
  style
}: AnimatedCandleFlameProps) {
  const progress = useSharedValue(mode === "flicker" ? 0.6 : 1);

  useEffect(() => {
    if (mode === "flicker") {
      progress.value = withDelay(
        delayMs,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
            withTiming(0.72, { duration: 520, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );
      return;
    }
    progress.value = withDelay(
      delayMs,
      withTiming(0, { duration: 680, easing: Easing.out(Easing.cubic) })
    );
  }, [delayMs, mode, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: mode === "extinguish" ? (1 - progress.value) * -8 : 0 },
      { scale: mode === "extinguish" ? 0.72 + progress.value * 0.28 : 0.96 + progress.value * 0.08 }
    ]
  }));

  return (
    <Animated.View
      {...decorativeViewAccessibilityProps}
      style={[styles.wrap, { width: size, height: size }, animatedStyle, style]}
    >
      <CandleFlameSvg width="100%" height="100%" />
    </Animated.View>
  );
}

export const AnimatedCandleFlame = memo(AnimatedCandleFlameBase);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  }
});
