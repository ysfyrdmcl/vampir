import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { MoonCrestSvg, VampirLogoMarkSvg, VillageSilhouetteSvg } from "../assets/svg";
import { AnimatedBats, AnimatedMist, FloatingSparks } from "./svg";
import { decorativeViewAccessibilityProps } from "./svg/decorativeProps";

interface BrandIntroAnimationProps {
  style?: StyleProp<ViewStyle>;
}

function BrandIntroAnimationBase({ style }: BrandIntroAnimationProps) {
  const hero = useSharedValue(0);
  const logo = useSharedValue(0);

  useEffect(() => {
    hero.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
    logo.value = withDelay(180, withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) }));
  }, [hero, logo]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: hero.value * 0.82,
    transform: [{ scale: 0.92 + hero.value * 0.08 }]
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logo.value,
    transform: [{ translateY: (1 - logo.value) * 8 }, { scale: 0.94 + logo.value * 0.06 }]
  }));

  return (
    <Animated.View {...decorativeViewAccessibilityProps} style={[styles.wrap, style]}>
      <VillageSilhouetteSvg width="100%" height={86} preserveAspectRatio="xMidYMax meet" style={styles.village} />
      <AnimatedMist height={96} opacity={0.1} style={styles.mist} />
      <AnimatedBats count={2} height={120} style={styles.bats} />
      <FloatingSparks count={4} radius={170} opacity={0.45} style={styles.sparks} />
      <Animated.View style={[styles.crest, heroStyle]}>
        <MoonCrestSvg width={160} height={160} />
      </Animated.View>
      <Animated.View style={[styles.logo, logoStyle]}>
        <VampirLogoMarkSvg width={78} height={78} />
      </Animated.View>
    </Animated.View>
  );
}

export const BrandIntroAnimation = memo(BrandIntroAnimationBase);

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: -36,
    right: -36,
    top: -74,
    height: 214,
    alignItems: "center",
    justifyContent: "center"
  },
  village: {
    position: "absolute",
    bottom: 4,
    opacity: 0.18
  },
  mist: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 10
  },
  bats: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 4
  },
  sparks: {
    top: 28
  },
  crest: {
    position: "absolute",
    top: 18
  },
  logo: {
    position: "absolute",
    top: 58
  }
});
