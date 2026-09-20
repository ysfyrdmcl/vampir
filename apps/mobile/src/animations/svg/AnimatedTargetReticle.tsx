import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { TargetReticleSvg } from "../../assets/svg";
import { useMotionEnabled } from "../../motion/MotionPreferences";
import { decorativeViewAccessibilityProps } from "./decorativeProps";

interface AnimatedTargetReticleProps {
  size?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

function AnimatedTargetReticleBase({
  size = 58,
  active = true,
  style
}: AnimatedTargetReticleProps) {
  const motionEnabled = useMotionEnabled();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!motionEnabled) {
      progress.value = active ? 0.6 : 0;
      return;
    }
    if (!active) {
      progress.value = withTiming(0, { duration: 160 });
      return () => cancelAnimation(progress);
    }
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 540, easing: Easing.out(Easing.cubic) }),
        withTiming(0.55, { duration: 620, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(progress);
  }, [active, motionEnabled, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.5,
    transform: [{ scale: 0.92 + progress.value * 0.12 }]
  }));

  return (
    <Animated.View
      {...decorativeViewAccessibilityProps}
      style={[styles.wrap, { width: size, height: size }, animatedStyle, style]}
    >
      <TargetReticleSvg width="100%" height="100%" />
    </Animated.View>
  );
}

export const AnimatedTargetReticle = memo(AnimatedTargetReticleBase);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  }
});
