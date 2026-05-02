import Ionicons from "@expo/vector-icons/Ionicons";
import type { GamePhase } from "@vampir-koylu/shared";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navigationRef } from "../app/navigation/navigation-ref";
import { GameBackground, type GameBackgroundVariant } from "../components/GameBackground";
import { GameToast } from "../components/GameToast";
import { getRouteForCurrentPhase, useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";

type SceneType = GameBackgroundVariant;

interface ScreenShellProps extends PropsWithChildren {
  scene?: SceneType;
  headerTitle?: string;
  showTopBar?: boolean;
  showBottomNav?: boolean;
}

function phaseLabelFromState(phase: GamePhase | null): string {
  if (!phase) return "VAMPIR KÖYLÜ";
  if (phase === "RoleReveal") return "GİZLİ KİMLİK";
  if (phase === "GameOver") return "OYUN BİTTİ";
  if (phase === "Lobby") return "LOBİ";
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
  const privateRole = useGameStore((s) => s.privateRole);
  const privateResultText = useGameStore((s) => s.privateResultText);
  const mePlayerId = useGameStore((s) => s.playerId);
  const storedRoomCode = useGameStore((s) => s.roomCode);
  const roomCode = roomState?.roomCode ?? storedRoomCode;
  const insets = useSafeAreaInsets();
  const label = headerTitle ?? phaseLabelFromState(phase);
  const meAlive = roomState?.players.find((player) => player.playerId === mePlayerId)?.isAlive ?? true;
  const statusAttention = Boolean(
    meAlive &&
      ((phase === "VampireVote" && privateRole === "Vampire") ||
        (phase === "DetectiveInspect" && privateRole === "Detective") ||
        (phase === "DoctorProtect" && privateRole === "Doctor") ||
        (phase === "GuardProtect" && privateRole === "Guard") ||
        (phase === "HunterLastBreath" && privateRole === "Hunter") ||
        phase === "DayVote" ||
        phase === "MayorElection")
  );
  const hasLogAttention = Boolean(privateResultText);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(uiStandard.motion.contentRiseDistance)).current;
  const backdropScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: uiStandard.motion.contentFadeMs,
        useNativeDriver: true
      }),
      Animated.timing(contentY, {
        toValue: 0,
        duration: uiStandard.motion.contentRiseMs,
        useNativeDriver: true
      })
    ]).start();
  }, [contentOpacity, contentY]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(backdropScale, {
          toValue: uiStandard.motion.backdropLoopScale,
          duration: uiStandard.motion.backdropLoopMs,
          useNativeDriver: true
        }),
        Animated.timing(backdropScale, {
          toValue: 1,
          duration: uiStandard.motion.backdropLoopMs,
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
        <GameBackground variant={scene} backdropScale={backdropScale} />

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
        <GameToast message={privateResultText} />

        {shouldShowBottomNav ? (
          <View style={[styles.bottomNav, { height: 74 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8) }]}>
            <Pressable style={styles.navItem} onPress={goStatus}>
              <View style={styles.navIconWrap}>
                <Ionicons name="eye-outline" size={24} color={navActive === 0 ? colors.secondary : "#6e6d72"} />
                {statusAttention ? <View style={styles.navDotDanger} /> : null}
              </View>
              <Text style={[styles.navLabel, navActive === 0 ? styles.navLabelActive : null]}>Durum</Text>
            </Pressable>
            <Pressable style={styles.navItem} onPress={() => navigateIfReady("GameLog")}>
              <View style={styles.navIconWrap}>
                <Ionicons name="book-outline" size={24} color={navActive === 1 ? colors.secondary : "#6e6d72"} />
                {hasLogAttention ? <View style={styles.navDotInfo} /> : null}
              </View>
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
  topBar: {
    height: 68,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(170,137,132,0.16)",
    paddingHorizontal: uiStandard.screen.pagePadding,
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
    borderRadius: uiStandard.screen.chipRadius,
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
    paddingHorizontal: uiStandard.screen.pagePadding,
    paddingTop: spacing.lg
  },
  bottomNav: {
    borderTopWidth: 1,
    borderTopColor: "rgba(233,195,73,0.18)",
    backgroundColor: "rgba(7,7,8,0.95)",
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
  navIconWrap: {
    minWidth: 26,
    minHeight: 26,
    alignItems: "center",
    justifyContent: "center"
  },
  navLabel: {
    color: "#6e6d72",
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  navLabelActive: {
    color: colors.secondary
  },
  navDotDanger: {
    position: "absolute",
    top: 1,
    right: -3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primaryBright
  },
  navDotInfo: {
    position: "absolute",
    top: 1,
    right: -3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.secondary
  }
});
