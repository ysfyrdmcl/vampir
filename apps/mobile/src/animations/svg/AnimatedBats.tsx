import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle, useWindowDimensions } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { BatSvg } from "../../assets/svg";
import { useMotionEnabled } from "../../motion/MotionPreferences";
import { svgMotion } from "../motionTokens";
import { decorativeViewAccessibilityProps } from "./decorativeProps";

type BatCount = 1 | 2 | 3 | 4;

interface AnimatedBatsProps {
  count?: BatCount;
  height?: number;
  durationMs?: number;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BAT_FLIGHTS = [
  { top: 24, from: -54, to: 1.04, scale: 0.55, delay: 0, rotate: "-8deg" },
  { top: 76, from: -76, to: 1.08, scale: 0.38, delay: 700, rotate: "6deg" },
  { top: 38, from: 1.05, to: -0.2, scale: 0.44, delay: 1400, rotate: "-4deg" },
  { top: 112, from: -64, to: 1.02, scale: 0.32, delay: 2100, rotate: "5deg" }
] as const;

function AnimatedBatsBase({
  count = 3,
  height = 160,
  durationMs = svgMotion.batFlyMs,
  loop = true,
  style
}: AnimatedBatsProps) {
  const { width } = useWindowDimensions();
  const visibleCount = Math.min(count, svgMotion.maxBats);

  return (
    <Animated.View
      {...decorativeViewAccessibilityProps}
      style={[styles.wrap, { height }, style]}
    >
      {BAT_FLIGHTS.slice(0, visibleCount).map((flight) => (
        <Bat key={`${flight.top}-${flight.delay}`} flight={flight} width={width} durationMs={durationMs} loop={loop} />
      ))}
    </Animated.View>
  );
}

function Bat({
  flight,
  width,
  durationMs,
  loop
}: {
  flight: (typeof BAT_FLIGHTS)[number];
  width: number;
  durationMs: number;
  loop: boolean;
}) {
  const motionEnabled = useMotionEnabled();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!motionEnabled) {
      progress.value = 0;
      return;
    }
    const animation = withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.cubic) });
    progress.value = withDelay(flight.delay, loop ? withRepeat(animation, -1, false) : animation);
    return () => cancelAnimation(progress);
  }, [durationMs, flight.delay, loop, motionEnabled, progress]);

  const fromX = typeof flight.from === "number" && flight.from < 0 ? flight.from : width * flight.from;
  const toX = width * flight.to;
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value > 0.02 && progress.value < 0.96 ? 0.78 : 0,
    transform: [
      { translateX: fromX + (toX - fromX) * progress.value },
      { translateY: Math.sin(progress.value * Math.PI) * -18 },
      { rotate: flight.rotate },
      { scale: flight.scale }
    ]
  }));

  return (
    <Animated.View style={[styles.bat, { top: flight.top }, animatedStyle]}>
      <BatSvg width={56} height={32} />
    </Animated.View>
  );
}

export const AnimatedBats = memo(AnimatedBatsBase);

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden"
  },
  bat: {
    position: "absolute",
    left: 0,
    width: 56,
    height: 32
  }
});
