import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { motionTokens } from "./motion-tokens";
import { useMotionEnabled } from "./MotionPreferences";

export function MotionHealthBadge() {
  const motionEnabled = useMotionEnabled();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!__DEV__ || !motionEnabled) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: motionTokens.duration.slow, easing: motionTokens.easing.entrance }),
        withTiming(0, { duration: motionTokens.duration.slow, easing: motionTokens.easing.exit })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(pulse);
    };
  }, [motionEnabled, pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.42 + pulse.value * 0.58,
    transform: [{ scale: 0.86 + pulse.value * 0.28 }]
  }));

  if (!__DEV__) return null;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.dot, dotStyle]} />
      <Text style={styles.label}>Motion hazır</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(88,193,182,0.22)",
    backgroundColor: "rgba(8,22,24,0.36)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#58c1b6",
    shadowColor: "#58c1b6",
    shadowOpacity: 0.34,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }
  },
  label: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 0.8
  }
});
