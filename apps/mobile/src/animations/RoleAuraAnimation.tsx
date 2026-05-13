import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import type { Role } from "@vampir-koylu/shared";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { roleSvgIconMap } from "../assets/svg";
import { FloatingSparks } from "./svg";
import { decorativeViewAccessibilityProps } from "./svg/decorativeProps";

interface RoleAuraAnimationProps {
  role: Role | null | undefined;
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

function RoleAuraAnimationBase({
  role,
  color,
  size = 156,
  style
}: RoleAuraAnimationProps) {
  const progress = useSharedValue(0);
  const RoleIcon = role ? roleSvgIconMap[role] : null;

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }),
        withTiming(0.42, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [progress]);

  const auraStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + progress.value * 0.14,
    transform: [{ scale: 0.96 + progress.value * 0.06 }]
  }));

  return (
    <Animated.View
      {...decorativeViewAccessibilityProps}
      style={[styles.wrap, { width: size, height: size }, style]}
    >
      <Animated.View style={[styles.aura, { borderColor: color, shadowColor: color }, auraStyle]} />
      <FloatingSparks count={3} radius={size} opacity={0.38} style={styles.sparks} />
      {RoleIcon ? (
        <Animated.View style={[styles.icon, auraStyle]}>
          <RoleIcon width={44} height={44} opacity={0.42} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export const RoleAuraAnimation = memo(RoleAuraAnimationBase);

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center"
  },
  aura: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 1,
    shadowOpacity: 0.38,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 }
  },
  sparks: {
    position: "absolute"
  },
  icon: {
    alignItems: "center",
    justifyContent: "center"
  }
});
