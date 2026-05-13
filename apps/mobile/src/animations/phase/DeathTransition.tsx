import { memo, useEffect } from "react";
import { StyleSheet } from "react-native";
import { AnimatedBloodDrop, AnimatedCandleFlame, AnimatedSeal, RedVignettePulse } from "../svg";
import { decorativeViewAccessibilityProps } from "../svg/decorativeProps";
import Animated from "react-native-reanimated";

function DeathTransitionBase() {
  useEffect(() => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[SVG_TRANSITION_COMPONENT] DeathTransition mounted");
    }
  }, []);

  return (
    <Animated.View {...decorativeViewAccessibilityProps} style={styles.wrap}>
      <RedVignettePulse intensity="medium" />
      <AnimatedBloodDrop x={-54} y={-22} />
      <AnimatedBloodDrop x={48} y={-10} delayMs={220} size={18} />
      <AnimatedCandleFlame mode="extinguish" delayMs={120} style={styles.flame} />
      <AnimatedSeal size={160} delayMs={180} style={styles.seal} />
    </Animated.View>
  );
}

export const DeathTransition = memo(DeathTransitionBase);

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  flame: {
    position: "absolute",
    top: "32%"
  },
  seal: {
    position: "absolute",
    top: "38%"
  }
});
