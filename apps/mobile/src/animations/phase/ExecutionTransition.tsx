import { memo, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { AnimatedSeal, AnimatedTargetReticle, AnimatedVoteScale, RedVignettePulse } from "../svg";
import { decorativeViewAccessibilityProps } from "../svg/decorativeProps";

function ExecutionTransitionBase() {
  useEffect(() => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[SVG_TRANSITION_COMPONENT] ExecutionTransition mounted");
    }
  }, []);

  return (
    <Animated.View {...decorativeViewAccessibilityProps} style={styles.wrap}>
      <RedVignettePulse intensity="low" />
      <AnimatedVoteScale size={180} style={styles.scale} />
      <AnimatedTargetReticle size={178} style={styles.reticle} />
      <AnimatedSeal size={160} delayMs={220} style={styles.seal} />
    </Animated.View>
  );
}

export const ExecutionTransition = memo(ExecutionTransitionBase);

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  scale: {
    position: "absolute",
    top: "28%",
    opacity: 0.72
  },
  reticle: {
    position: "absolute",
    top: "32%"
  },
  seal: {
    position: "absolute",
    top: "39%"
  }
});
