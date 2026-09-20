import { memo, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { NightMoonSvg } from "../../assets/svg";
import { AnimatedBats, AnimatedMist } from "../svg";
import { decorativeViewAccessibilityProps } from "../svg/decorativeProps";

function NightStartTransitionBase() {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[SVG_TRANSITION_COMPONENT] NightStartTransition mounted");
    }
    progress.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  const moonStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ scale: 0.9 + progress.value * 0.1 }]
  }));

  return (
    <Animated.View {...decorativeViewAccessibilityProps} style={styles.wrap}>
      <AnimatedMist height={180} opacity={0.35} style={styles.mist} />
      <Animated.View style={[styles.moon, moonStyle]}>
        <NightMoonSvg width={220} height={220} />
      </Animated.View>
      <AnimatedBats count={3} loop={false} height={170} style={styles.bats} />
    </Animated.View>
  );
}

export const NightStartTransition = memo(NightStartTransitionBase);

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill
  },
  mist: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 40
  },
  moon: {
    position: "absolute",
    top: "18%",
    alignSelf: "center",
    width: 220,
    height: 220
  },
  bats: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "14%"
  }
});
