import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { VoteScaleSvg } from "../../assets/svg";
import { decorativeViewAccessibilityProps } from "./decorativeProps";

interface AnimatedVoteScaleProps {
  size?: number;
  wobble?: boolean;
  delayMs?: number;
  style?: StyleProp<ViewStyle>;
}

function AnimatedVoteScaleBase({
  size = 92,
  wobble = true,
  delayMs = 0,
  style
}: AnimatedVoteScaleProps) {
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
    if (wobble) {
      rotation.value = withDelay(
        delayMs,
        withSequence(
          withTiming(-3, { duration: 130 }),
          withTiming(3, { duration: 170 }),
          withTiming(-1, { duration: 130 }),
          withTiming(0, { duration: 150 })
        )
      );
    }
  }, [delayMs, opacity, rotation, wobble]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + opacity.value * 0.65,
    transform: [{ rotate: `${rotation.value}deg` }]
  }));

  return (
    <Animated.View
      {...decorativeViewAccessibilityProps}
      style={[styles.wrap, { width: size, height: size }, animatedStyle, style]}
    >
      <VoteScaleSvg width="100%" height="100%" />
    </Animated.View>
  );
}

export const AnimatedVoteScale = memo(AnimatedVoteScaleBase);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  }
});
