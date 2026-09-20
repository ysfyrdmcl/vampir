import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { GoldSparkSvg } from "../../assets/svg";
import { useMotionEnabled } from "../../motion/MotionPreferences";
import { svgMotion } from "../motionTokens";
import { decorativeViewAccessibilityProps } from "./decorativeProps";

type SparkCount = 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface FloatingSparksProps {
  count?: SparkCount;
  radius?: number;
  loop?: boolean;
  burst?: boolean;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}

const SPARKS = [
  { left: "18%", top: "18%", size: 16, delay: 0 },
  { left: "72%", top: "24%", size: 12, delay: 180 },
  { left: "58%", top: "70%", size: 18, delay: 340 },
  { left: "28%", top: "78%", size: 11, delay: 500 },
  { left: "82%", top: "52%", size: 14, delay: 660 },
  { left: "10%", top: "58%", size: 12, delay: 820 },
  { left: "46%", top: "12%", size: 10, delay: 980 },
  { left: "40%", top: "88%", size: 13, delay: 1140 }
] as const;

function FloatingSparksBase({
  count = 5,
  radius = 180,
  loop = true,
  burst = false,
  opacity = 0.58,
  style
}: FloatingSparksProps) {
  return (
    <Animated.View
      {...decorativeViewAccessibilityProps}
      style={[styles.wrap, { width: radius, height: radius }, style]}
    >
      {SPARKS.slice(0, Math.min(count, svgMotion.maxSparks)).map((spark, index) => (
        <Spark key={`${spark.left}-${spark.top}`} plan={spark} loop={loop} burst={burst} opacity={opacity} index={index} />
      ))}
    </Animated.View>
  );
}

function Spark({
  plan,
  loop,
  burst,
  opacity,
  index
}: {
  plan: (typeof SPARKS)[number];
  loop: boolean;
  burst: boolean;
  opacity: number;
  index: number;
}) {
  const motionEnabled = useMotionEnabled();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!motionEnabled) {
      progress.value = 0.5;
      return;
    }
    const animation = withSequence(
      withTiming(1, { duration: svgMotion.sparkTwinkleMs, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: svgMotion.sparkTwinkleMs, easing: Easing.in(Easing.quad) })
    );
    progress.value = withDelay(
      plan.delay,
      loop ? withRepeat(animation, -1, false) : animation
    );
    return () => cancelAnimation(progress);
  }, [loop, motionEnabled, plan.delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value * opacity,
    transform: [
      { translateY: burst ? -10 * progress.value : -4 * progress.value },
      { scale: 0.72 + progress.value * (index % 2 ? 0.48 : 0.34) }
    ]
  }));

  return (
    <Animated.View style={[styles.spark, { left: plan.left, top: plan.top, width: plan.size, height: plan.size }, animatedStyle]}>
      <GoldSparkSvg width="100%" height="100%" />
    </Animated.View>
  );
}

export const FloatingSparks = memo(FloatingSparksBase);

const styles = StyleSheet.create({
  wrap: {
    position: "absolute"
  },
  spark: {
    position: "absolute"
  }
});
