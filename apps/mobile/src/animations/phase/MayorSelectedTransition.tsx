import { memo, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { MayorCrownSvg, VoteScaleSvg } from "../../assets/svg";
import { AnimatedSeal, FloatingSparks } from "../svg";
import { decorativeViewAccessibilityProps } from "../svg/decorativeProps";

function MayorSelectedTransitionBase() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 640, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  const crownStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + progress.value * 0.7,
    transform: [
      { translateY: -18 + progress.value * 18 },
      { scale: 0.82 + progress.value * 0.18 }
    ]
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + progress.value * 0.45,
    transform: [{ scale: 0.94 + progress.value * 0.06 }]
  }));

  const sealStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.88 + progress.value * 0.12 }]
  }));

  return (
    <Animated.View {...decorativeViewAccessibilityProps} style={styles.wrap}>
      <FloatingSparks count={4} radius={240} loop={false} burst opacity={0.78} style={styles.sparks} />
      <Animated.View style={[styles.scale, scaleStyle]}>
        <VoteScaleSvg width={210} height={210} />
      </Animated.View>
      <Animated.View style={[styles.crown, crownStyle]}>
        <MayorCrownSvg width={180} height={180} />
      </Animated.View>
      <Animated.View style={[styles.seal, sealStyle]}>
        <AnimatedSeal size={138} delayMs={180} />
      </Animated.View>
    </Animated.View>
  );
}

export const MayorSelectedTransition = memo(MayorSelectedTransitionBase);

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  sparks: {
    position: "absolute",
    top: "16%",
    alignSelf: "center"
  },
  scale: {
    position: "absolute",
    top: "24%",
    opacity: 0.55
  },
  crown: {
    position: "absolute",
    top: "22%"
  },
  seal: {
    position: "absolute",
    top: "40%"
  }
});
