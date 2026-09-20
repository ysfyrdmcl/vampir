import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { MistLayerSvg } from "../../assets/svg";
import { useMotionEnabled } from "../../motion/MotionPreferences";
import { svgMotion } from "../motionTokens";
import { decorativeViewAccessibilityProps } from "./decorativeProps";

interface AnimatedMistProps {
  height?: number;
  opacity?: number;
  durationMs?: number;
  reverse?: boolean;
  style?: StyleProp<ViewStyle>;
}

function AnimatedMistBase({
  height = 180,
  opacity = 0.11,
  durationMs = svgMotion.mistDriftMs,
  reverse = false,
  style
}: AnimatedMistProps) {
  const motionEnabled = useMotionEnabled();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (!motionEnabled) {
      drift.value = 0.5;
      return;
    }
    drift.value = 0;
    drift.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => cancelAnimation(drift);
  }, [drift, durationMs, motionEnabled]);

  const frontStyle = useAnimatedStyle(() => ({
    opacity,
    transform: [{ translateX: (reverse ? -1 : 1) * (-26 + drift.value * 52) }]
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: opacity * 0.62,
    transform: [{ translateX: (reverse ? 1 : -1) * (-20 + drift.value * 40) }]
  }));

  return (
    <Animated.View
      {...decorativeViewAccessibilityProps}
      style={[styles.wrap, { height }, style]}
    >
      <Animated.View style={[styles.layer, backStyle]}>
        <MistLayerSvg width="115%" height="100%" preserveAspectRatio="none" />
      </Animated.View>
      <Animated.View style={[styles.layer, frontStyle]}>
        <MistLayerSvg width="115%" height="100%" preserveAspectRatio="none" />
      </Animated.View>
    </Animated.View>
  );
}

export const AnimatedMist = memo(AnimatedMistBase);

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden"
  },
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center"
  }
});
