import type { ImageSourcePropType } from "react-native";
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
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.Image source={sceneBackgrounds[variant]} resizeMode="cover" style={[styles.backdrop, { transform: [{ scale: backdropScale }] }]} />
      <LinearGradient colors={["rgba(5,5,5,0.94)", "rgba(9,8,10,0.90)", "rgba(5,5,5,0.96)"]} style={styles.overlay} />
      <LinearGradient colors={["rgba(15,16,20,0.20)", "rgba(15,16,20,0)", "rgba(15,16,20,0.26)"]} style={styles.textureLayer} />
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
  }
});
