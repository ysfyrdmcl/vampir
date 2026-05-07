import type { ImageSourcePropType } from "react-native";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { uiStandard } from "../ui/ui-standard";

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
  home: require("../assets/references/home.png"),
  create: require("../assets/references/create_room.png"),
  join: require("../assets/references/join_room.png"),
  lobby: require("../assets/references/lobby.png"),
  role: require("../assets/references/role_reveal.png"),
  night: require("../assets/references/night_phase.png"),
  vampire: require("../assets/references/vampire_action.png"),
  detective: require("../assets/references/detective_action.png"),
  doctor: require("../assets/references/doctor_action.png"),
  day: require("../assets/references/day_phase.png"),
  vote: require("../assets/references/voting.png"),
  tie: require("../assets/references/tie_discussion.png"),
  result: require("../assets/references/execution_result.png"),
  gameover: require("../assets/references/game_over.png"),
  splash: require("../assets/references/splash.png")
};

interface GameBackgroundProps {
  variant: GameBackgroundVariant;
  backdropScale: Animated.Value;
}

export function GameBackground({ variant, backdropScale }: GameBackgroundProps) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    drift.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift, variant]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.Image source={sceneBackgrounds[variant]} resizeMode="cover" style={[styles.backdrop, { transform: [{ scale: backdropScale }] }]} />
      <LinearGradient colors={["rgba(5,5,5,0.88)", "rgba(9,8,10,0.86)", "rgba(5,5,5,0.93)"]} style={styles.overlay} />
      <LinearGradient colors={["rgba(15,16,20,0.20)", "rgba(15,16,20,0)", "rgba(15,16,20,0.26)"]} style={styles.textureLayer} />
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
      <LinearGradient
        colors={[uiStandard.phaseTheme[variant].accent, "rgba(12,12,15,0)", uiStandard.phaseTheme[variant].atmosphere]}
        style={styles.tint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22
  },
  overlay: {
    ...StyleSheet.absoluteFillObject
  },
  tint: {
    ...StyleSheet.absoluteFillObject
  },
  textureLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: uiStandard.fx.textureOpacity
  },
  ambientDrift: {
    position: "absolute",
    left: "-20%",
    right: "-20%",
    top: "-8%",
    height: "58%",
    overflow: "hidden"
  }
});
