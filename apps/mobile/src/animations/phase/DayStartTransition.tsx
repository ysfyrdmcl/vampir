import { memo, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { DaySunSvg, VillageSilhouetteSvg } from "../../assets/svg";
import { AnimatedMist, FloatingSparks } from "../svg";
import { decorativeViewAccessibilityProps } from "../svg/decorativeProps";

function DayStartTransitionBase() {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[SVG_TRANSITION_COMPONENT] DayStartTransition mounted");
    }
    progress.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  const sunStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ scale: 0.88 + progress.value * 0.12 }]
  }));

  return (
    <Animated.View {...decorativeViewAccessibilityProps} style={styles.wrap}>
      <VillageSilhouetteSvg width="100%" height={130} preserveAspectRatio="xMidYMax meet" style={styles.village} />
      <AnimatedMist height={150} opacity={0.35} reverse style={styles.mist} />
      <FloatingSparks count={5} radius={220} loop={false} burst opacity={0.8} style={styles.sparks} />
      <Animated.View style={[styles.sun, sunStyle]}>
        <DaySunSvg width={220} height={220} />
      </Animated.View>
    </Animated.View>
  );
}

export const DayStartTransition = memo(DayStartTransitionBase);

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill
  },
  village: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 44,
    opacity: 0.22
  },
  mist: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 54
  },
  sparks: {
    alignSelf: "center",
    top: "22%"
  },
  sun: {
    position: "absolute",
    top: "19%",
    alignSelf: "center",
    width: 220,
    height: 220
  }
});
