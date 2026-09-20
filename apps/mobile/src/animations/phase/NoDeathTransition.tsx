import { memo } from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { AnimatedShield, FloatingSparks } from "../svg";
import { decorativeViewAccessibilityProps } from "../svg/decorativeProps";

function NoDeathTransitionBase() {
  return (
    <Animated.View {...decorativeViewAccessibilityProps} style={styles.wrap}>
      <AnimatedShield size={190} style={styles.shield} />
      <FloatingSparks count={5} radius={220} loop={false} burst opacity={0.58} style={styles.sparks} />
    </Animated.View>
  );
}

export const NoDeathTransition = memo(NoDeathTransitionBase);

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center"
  },
  shield: {
    position: "absolute"
  },
  sparks: {
    position: "absolute"
  }
});
