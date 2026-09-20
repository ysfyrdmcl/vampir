import type { ImageSourcePropType } from "react-native";
import { memo, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedBats, AnimatedMist, RedVignettePulse } from "../animations/svg";
import { uiStandard } from "../ui/ui-standard";
import { colors } from "../theme/colors";
import { useMotionEnabled } from "../motion/MotionPreferences";

export type GameBackgroundVariant =
  | "home"
  | "create"
  | "join"
  | "lobby"
  | "role"
  | "night"
  | "vampire"
  | "detective"
  | "doctor"
  | "day"
  | "vote"
  | "tie"
  | "result"
  | "gameover"
  | "splash";

const sceneBackgrounds: Record<GameBackgroundVariant, ImageSourcePropType> = {
  home: require("../assets/backgrounds/bg_menu_village_moon.png"),
  create: require("../assets/backgrounds/bg_lobby_tavern_dark.png"),
  join: require("../assets/backgrounds/bg_lobby_tavern_dark.png"),
  lobby: require("../assets/backgrounds/bg_lobby_tavern_dark.png"),
  role: require("../assets/backgrounds/bg_menu_village_moon.png"),
  night: require("../assets/backgrounds/bg_night_forest_fog.png"),
  vampire: require("../assets/backgrounds/bg_night_forest_fog.png"),
  detective: require("../assets/backgrounds/bg_night_forest_fog.png"),
  doctor: require("../assets/backgrounds/bg_night_forest_fog.png"),
  day: require("../assets/backgrounds/bg_day_village_square.png"),
  vote: require("../assets/backgrounds/bg_vote_council.png"),
  tie: require("../assets/backgrounds/bg_vote_council.png"),
  result: require("../assets/backgrounds/bg_vote_council.png"),
  gameover: require("../assets/backgrounds/bg_gameover_village.png"),
  splash: require("../assets/backgrounds/bg_menu_village_moon.png")
};

interface GameBackgroundProps {
  variant: GameBackgroundVariant;
  backdropScale: Animated.Value;
  mode?: "game" | "solid" | "none";
}

export const GameBackground = memo(function GameBackground({ variant, backdropScale, mode = "game" }: GameBackgroundProps) {
  const drift = useRef(new Animated.Value(0)).current;
  const motionEnabled = useMotionEnabled();
  const showNightAtmosphere =
    mode !== "none" && (variant === "night" || variant === "vampire" || variant === "detective" || variant === "doctor");
  const showBats = mode !== "none" && (variant === "night" || variant === "vampire");
  const showBloodPulse = mode !== "none" && variant === "vampire";

  useEffect(() => {
    drift.setValue(0);
    if (!motionEnabled || mode === "none") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, useNativeDriver: true, isInteraction: false }),
        Animated.timing(drift, { toValue: 0, duration: 9000, useNativeDriver: true, isInteraction: false })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift, variant, motionEnabled, mode]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.opaqueBase} />
      {mode === "game" ? (
        <Animated.Image source={sceneBackgrounds[variant]} resizeMode="cover" style={[styles.backdrop, { transform: [{ scale: backdropScale }] }]} />
      ) : null}
      <LinearGradient colors={["rgba(5,5,5,0.88)", "rgba(9,8,10,0.86)", "rgba(5,5,5,0.93)"]} style={styles.overlay} />
      <LinearGradient colors={["rgba(15,16,20,0.20)", "rgba(15,16,20,0)", "rgba(15,16,20,0.26)"]} style={styles.textureLayer} />
      {mode !== "none" ? (
        <Animated.View
          style={[
            styles.ambientDrift,
            {
              opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.32] }),
              transform: [
                { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-34, 36] }) },
                { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [18, -22] }) },
                { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }
              ]
            }
          ]}
        >
          <LinearGradient
            colors={[uiStandard.phaseTheme[variant].accent, "rgba(12,12,15,0)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
      {showNightAtmosphere ? (
        <AnimatedMist height={150} opacity={variant === "vampire" ? 0.22 : 0.16} style={styles.mist} />
      ) : null}
      {showBats ? (
        <AnimatedBats count={variant === "vampire" ? 3 : 2} height={120} durationMs={variant === "vampire" ? 3900 : 4600} style={styles.bats} />
      ) : null}
      {showBloodPulse ? <RedVignettePulse intensity="low" durationMs={1100} /> : null}
      <LinearGradient
        colors={[uiStandard.phaseTheme[variant].accent, "rgba(12,12,15,0)", uiStandard.phaseTheme[variant].atmosphere]}
        style={styles.tint}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  opaqueBase: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.backgroundDeep
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    opacity: 0.22
  },
  overlay: {
    ...StyleSheet.absoluteFill
  },
  tint: {
    ...StyleSheet.absoluteFill
  },
  textureLayer: {
    ...StyleSheet.absoluteFill,
    opacity: uiStandard.fx.textureOpacity
  },
  ambientDrift: {
    position: "absolute",
    left: "-20%",
    right: "-20%",
    top: "-8%",
    height: "58%",
    overflow: "hidden"
  },
  mist: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0
  },
  bats: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "11%"
  }
});
