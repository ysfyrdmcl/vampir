import { memo, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { LoverIconSvg } from "../../assets/svg";
import { AnimatedBloodDrop, AnimatedSeal, RedVignettePulse } from "../svg";
import { decorativeViewAccessibilityProps } from "../svg/decorativeProps";

function LoverChainTransitionBase() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 680, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  const heartStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: 0.86 + progress.value * 0.14 },
      { rotate: `${-4 + progress.value * 4}deg` }
    ]
  }));

  const secondHeartStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.86,
    transform: [
      { translateX: 42 },
      { translateY: 18 },
      { scale: 0.58 + progress.value * 0.1 },
      { rotate: `${6 - progress.value * 4}deg` }
    ]
  }));

  const sealStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.9 + progress.value * 0.1 }]
  }));

  return (
    <Animated.View {...decorativeViewAccessibilityProps} style={styles.wrap}>
      <RedVignettePulse intensity="medium" />
      <AnimatedBloodDrop x={-62} y={-28} delayMs={120} size={18} />
      <AnimatedBloodDrop x={58} y={-12} delayMs={280} size={14} />
      <Animated.View style={[styles.heart, heartStyle]}>
        <LoverIconSvg width={190} height={190} />
      </Animated.View>
      <Animated.View style={[styles.secondHeart, secondHeartStyle]}>
        <LoverIconSvg width={150} height={150} />
      </Animated.View>
      <Animated.View style={[styles.seal, sealStyle]}>
        <AnimatedSeal size={150} delayMs={220} />
      </Animated.View>
    </Animated.View>
  );
}

export const LoverChainTransition = memo(LoverChainTransitionBase);

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center"
  },
  heart: {
    position: "absolute",
    top: "23%"
  },
  secondHeart: {
    position: "absolute",
    top: "26%",
    opacity: 0.72
  },
  seal: {
    position: "absolute",
    top: "42%"
  }
});
