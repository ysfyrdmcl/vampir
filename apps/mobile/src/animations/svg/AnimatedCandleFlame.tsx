import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
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
  const wind = useSharedValue(0);

  useEffect(() => {
    if (mode === "flicker") {
      progress.value = withDelay(
        delayMs,
        withRepeat(
          withSequence(
            withTiming(0.96, { duration: 180, easing: Easing.out(Easing.quad) }),
            withTiming(0.68, { duration: 140, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
            withTiming(0.78, { duration: 260, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          false
        )
      );
      wind.value = withDelay(
        delayMs + 90,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 360, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 300, easing: Easing.inOut(Easing.sin) })
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
    wind.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) });
  }, [delayMs, mode, progress, wind]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: mode === "extinguish" ? progress.value : interpolate(progress.value, [0.68, 1], [0.78, 1]),
    transform: [
      { translateY: mode === "extinguish" ? (1 - progress.value) * -8 : 0 },
      { translateX: mode === "extinguish" ? 0 : interpolate(wind.value, [0, 1], [-1.2, 1.4]) },
      { rotate: mode === "extinguish" ? "0deg" : `${interpolate(wind.value, [0, 1], [-1.8, 2.2])}deg` },
      { scaleX: mode === "extinguish" ? 0.72 + progress.value * 0.28 : interpolate(progress.value, [0.68, 1], [0.9, 1.06]) },
      { scaleY: mode === "extinguish" ? 0.72 + progress.value * 0.28 : interpolate(progress.value, [0.68, 1], [0.94, 1.14]) }
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
