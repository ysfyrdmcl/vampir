import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { GamePhase } from "@vampir-koylu/shared";
import { LinearGradient } from "expo-linear-gradient";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navigationRef } from "../app/navigation/navigation-ref";
import { getRouteForCurrentPhase, useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type SceneType =
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

interface ScreenShellProps extends PropsWithChildren {
  scene?: SceneType;
  headerTitle?: string;
  showTopBar?: boolean;
  showBottomNav?: boolean;
}

const sceneBackgrounds: Record<SceneType, ImageSourcePropType> = {
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

function phaseLabelFromState(phase: GamePhase | null): string {
  if (!phase) return "VAMPIR KÖYLÜ";
  if (phase === "RoleReveal") return "GİZLİ KİMLİK";
  if (phase === "GameOver") return "OYUN BİTTİ";
  if (phase === "Lobby") return "LOBI";
  if (phase === "DayStart" || phase === "MayorElection" || phase === "GuardProtect" || phase === "DayDiscussion" || phase === "DayVote" || phase === "ExecutionResolve" || phase === "HunterLastBreath" || phase === "WinCheck") {
    return "GÜNDÜZ FAZI";
  }
  return "GECE FAZI";
}

function activeNavIndex(scene: SceneType): number {
  if (scene === "day") return 1;
  if (scene === "result") return 2;
  return 0;
}

export function ScreenShell({ children, scene = "night", headerTitle, showTopBar = true, showBottomNav = true }: ScreenShellProps) {
  const roomState = useGameStore((s) => s.roomState);
  const phase = useGameStore((s) => s.gameState?.phase ?? null);
  const storedRoomCode = useGameStore((s) => s.roomCode);
  const roomCode = roomState?.roomCode ?? storedRoomCode;
  const insets = useSafeAreaInsets();
  const label = headerTitle ?? phaseLabelFromState(phase);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(14)).current;
  const backdropScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 340,
        useNativeDriver: true
      }),
      Animated.timing(contentY, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true
      })
    ]).start();
  }, [contentOpacity, contentY]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(backdropScale, {
          toValue: 1.04,
          duration: 14000,
          useNativeDriver: true
        }),
        Animated.timing(backdropScale, {
          toValue: 1,
          duration: 14000,
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [backdropScale]);

  const navActive = useMemo(() => activeNavIndex(scene), [scene]);
  const shouldShowTopBar = showTopBar && scene !== "home";
  const shouldShowBottomNav = showBottomNav && (roomState?.status === "InGame" || roomState?.status === "GameOver");
  const navigateIfReady = (route: "GameOver" | "GameLog" | "GameSettings" | "RoleReveal" | "Night" | "Vote" | "Lobby") => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate(route);
  };
  const goStatus = () => {
    if (roomState?.status === "GameOver") {
      navigateIfReady("GameOver");
      return;
    }
    const route = getRouteForCurrentPhase(phase);
    navigateIfReady(route);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.root}>
        <Animated.Image source={sceneBackgrounds[scene]} resizeMode="cover" style={[styles.backdrop, { transform: [{ scale: backdropScale }] }]} />
        <LinearGradient colors={["rgba(5,5,5,0.94)", "rgba(9,8,10,0.90)", "rgba(5,5,5,0.96)"]} style={styles.overlay} />
        <LinearGradient colors={["rgba(139,0,0,0.16)", "rgba(15,16,20,0)", "rgba(10,13,30,0.34)"]} style={styles.tint} />

        {shouldShowTopBar ? (
          <View style={styles.topBar}>
            <View style={styles.topLeft}>
              <Ionicons name="shield-outline" size={24} color={colors.primaryBright} />
              <Text style={styles.topLabel}>{label}</Text>
            </View>
            {roomCode ? (
              <View style={styles.roomCodeChip}>
                <Text style={styles.roomCodeText}>#{roomCode}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Animated.View style={[styles.content, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}>{children}</Animated.View>

        {shouldShowBottomNav ? (
          <View style={[styles.bottomNav, { height: 74 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8) }]}>
            <Pressable style={styles.navItem} onPress={goStatus}>
              <MaterialCommunityIcons name="castle" size={24} color={navActive === 0 ? colors.primaryBright : "#6e6d72"} />
              <Text style={[styles.navLabel, navActive === 0 ? styles.navLabelActive : null]}>Durum</Text>
            </Pressable>
            <Pressable style={styles.navItem} onPress={() => navigateIfReady("GameLog")}>
              <MaterialCommunityIcons name="book-open-variant" size={24} color={navActive === 1 ? colors.primaryBright : "#6e6d72"} />
              <Text style={[styles.navLabel, navActive === 1 ? styles.navLabelActive : null]}>Günlük</Text>
            </Pressable>
            <Pressable style={styles.navItem} onPress={() => navigateIfReady("GameSettings")}>
              <Ionicons name="settings-outline" size={22} color={navActive === 2 ? colors.primaryBright : "#6e6d72"} />
              <Text style={[styles.navLabel, navActive === 2 ? styles.navLabelActive : null]}>Ayarlar</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundDeep
  },
  root: {
    flex: 1,
    backgroundColor: colors.backgroundDeep,
    overflow: "hidden"
  },
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
  topBar: {
    height: 68,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(170,137,132,0.16)",
    paddingHorizontal: spacing.safe,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row"
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  topLabel: {
    color: colors.primaryBright,
    fontFamily: typography.serif,
    fontSize: 16,
    letterSpacing: 1.7
  },
  roomCodeChip: {
    minWidth: 90,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.4)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(32,31,31,0.8)"
  },
  roomCodeText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: typography.small,
    letterSpacing: 1.3
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.safe,
    paddingTop: spacing.lg
  },
  bottomNav: {
    borderTopWidth: 1,
    borderTopColor: "rgba(170,137,132,0.14)",
    backgroundColor: "#050505",
    height: 74,
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  navItem: {
    width: "32%",
    alignItems: "center",
    gap: 4
  },
  navLabel: {
    color: "#6e6d72",
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  navLabelActive: {
    color: colors.primaryBright
  }
});
