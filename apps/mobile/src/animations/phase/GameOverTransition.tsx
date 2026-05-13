import { memo, useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { GameOverVampireSvg, GameOverVillagerSvg } from "../../assets/svg";
import { AnimatedBats, AnimatedMist, FloatingSparks } from "../svg";
import { decorativeViewAccessibilityProps } from "../svg/decorativeProps";

interface GameOverTransitionProps {
  winner: string | null | undefined;
  style?: StyleProp<ViewStyle>;
}

function isVampireWinner(winner: string | null | undefined) {
  return winner === "Vampires" || winner === "Vampire";
}

function isVillageWinner(winner: string | null | undefined) {
  return winner === "Villagers" || winner === "Village";
}

function GameOverTransitionBase({ winner, style }: GameOverTransitionProps) {
  const progress = useSharedValue(0);
  const vampire = isVampireWinner(winner);
  const village = isVillageWinner(winner);
  const Hero = vampire ? GameOverVampireSvg : village ? GameOverVillagerSvg : null;

  useEffect(() => {
    progress.value = withTiming(Hero ? 1 : 0, { duration: 620, easing: Easing.out(Easing.cubic) });
  }, [Hero, progress]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.9,
    transform: [{ scale: 0.94 + progress.value * 0.06 }]
  }));

  if (!Hero) return null;

  return (
    <Animated.View {...decorativeViewAccessibilityProps} style={[styles.wrap, style]}>
      {vampire ? <AnimatedMist height={180} opacity={0.16} style={styles.mist} /> : null}
      {vampire ? <AnimatedBats count={3} height={150} style={styles.bats} /> : null}
      {village ? <FloatingSparks count={6} radius={240} opacity={0.46} style={styles.sparks} /> : null}
      <Animated.View style={[styles.hero, heroStyle]}>
        <Hero width={170} height={170} />
      </Animated.View>
    </Animated.View>
  );
}

export const GameOverTransition = memo(GameOverTransitionBase);

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 230,
    alignItems: "center",
    justifyContent: "center"
  },
  mist: {
    position: "absolute",
    left: -24,
    right: -24,
    bottom: 18
  },
  bats: {
    position: "absolute",
    left: -24,
    right: -24,
    top: 14
  },
  sparks: {
    top: 2
  },
  hero: {
    position: "absolute",
    top: 22
  }
});
