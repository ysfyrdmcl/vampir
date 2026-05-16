import Ionicons from "@expo/vector-icons/Ionicons";
import type { GamePhase } from "@vampir-koylu/shared";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navigationRef } from "../app/navigation/navigation-ref";
import { GameBackground, type GameBackgroundVariant } from "../components/GameBackground";
import { LiquidGlassPressable, LiquidGlassSurface, glassTokens } from "../glass";
import { BotSpeechOverlay } from "../components/BotSpeechOverlay";
import { BotSpeechHistorySheet } from "../components/BotSpeechHistorySheet";
import { GameToast } from "../components/GameToast";
import { InGameTopBar } from "../components/InGameTopBar";
import { useLogFeedStore } from "../logging/log-feed-store";
import { getRouteForCurrentPhase, useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { getResponsiveMetrics, scaledSize } from "../theme/layout";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { isGlobalCriticalErrorCode, socketErrorAllowedForRoute, toFriendlyToastText } from "../ui/error-text";
import { showToast } from "../ui/toast-store";
import { uiStandard } from "../ui/ui-standard";

type SceneType = GameBackgroundVariant;

interface ScreenShellProps extends PropsWithChildren {
  scene?: SceneType;
  backgroundMode?: "game" | "solid" | "none";
  opaqueBackground?: boolean;
  /** Alt menüde hangi sekmenin vurgulanacağı (görsel `scene` ile karışmasın — örn. gündüz atmosferi + Durum sekmesi). */
  bottomNavActiveIndex?: 0 | 1 | 2;
  headerTitle?: string;
  showTopBar?: boolean;
  showBottomNav?: boolean;
  showPauseOverlay?: boolean;
  contentDensity?: "default" | "game";
  keyboardAware?: boolean;
  keyboardVerticalOffset?: number;
  keyboardExtraScrollPadding?: number;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
  keyboardAwareContentContainerStyle?: StyleProp<ViewStyle>;
  suppressTransientBotSpeech?: boolean;
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

export function ScreenShell({
  children,
  scene = "night",
  backgroundMode,
  opaqueBackground: _opaqueBackground = false,
  bottomNavActiveIndex,
  headerTitle,
  showTopBar = true,
  showBottomNav = true,
  showPauseOverlay = true,
  contentDensity = "default",
  keyboardAware = false,
  keyboardVerticalOffset,
  keyboardExtraScrollPadding = spacing.lg,
  keyboardShouldPersistTaps = "handled",
  keyboardAwareContentContainerStyle,
  suppressTransientBotSpeech = false
}: ScreenShellProps) {
  const roomState = useGameStore((s) => s.roomState);
  const gameState = useGameStore((s) => s.gameState);
  const phase = gameState?.phase ?? null;
  const privateRole = useGameStore((s) => s.privateRole);
  const errorCode = useGameStore((s) => s.errorCode);
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const botSpeechHistory = useGameStore((s) => s.botSpeechHistory);
  const botSpeechUnreadCount = useGameStore((s) => s.botSpeechUnreadCount);
  const activeBotSpeech = useGameStore((s) => s.activeBotSpeech);
  const markBotSpeechInboxRead = useGameStore((s) => s.markBotSpeechInboxRead);
  const unreadLogCount = useLogFeedStore((s) => s.unreadCount);
  const mePlayerId = useGameStore((s) => s.playerId);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const label = headerTitle ?? phaseLabelFromState(phase);
  const meAlive = roomState?.players.find((player) => player.playerId === mePlayerId)?.isAlive ?? true;
  const isHost = Boolean(roomState?.hostPlayerId && roomState.hostPlayerId === mePlayerId);
  const isPaused = Boolean(gameState?.isPaused && roomState?.status === "InGame");
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
  const hasLogAttention = unreadLogCount > 0;
  const [rumorsOpen, setRumorsOpen] = useState(false);

  const lastErrorToastRef = useRef<{ code: string | null; at: number }>({ code: null, at: 0 });
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(uiStandard.motion.contentRiseDistance)).current;
  const backdropScale = useRef(new Animated.Value(1)).current;
  const connectionPulse = useRef(new Animated.Value(0)).current;
  const showConnectionBanner = Boolean(roomState) && connectionStatus !== "connected" && connectionStatus !== "idle";

  useEffect(() => {
    if (!showConnectionBanner) {
      connectionPulse.stopAnimation();
      connectionPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(connectionPulse, { toValue: 1, duration: 720, useNativeDriver: true }),
        Animated.timing(connectionPulse, { toValue: 0, duration: 720, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [connectionPulse, showConnectionBanner]);

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

  useEffect(() => {
    if (!errorCode) return;
    if (!isGlobalCriticalErrorCode(errorCode)) return;
    const route = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
    if (!socketErrorAllowedForRoute(errorCode, route)) return;
    const toastText = toFriendlyToastText(errorCode);
    if (!toastText) return;
    const now = Date.now();
    if (
      errorCode &&
      errorCode === lastErrorToastRef.current.code &&
      now - lastErrorToastRef.current.at < 2800
    ) {
      return;
    }
    lastErrorToastRef.current = { code: errorCode, at: now };
    showToast(toastText, "danger", 2200);
  }, [errorCode]);

  const navFromScene = useMemo(() => activeNavIndex(scene), [scene]);
  const navActive = bottomNavActiveIndex ?? navFromScene;
  const shouldShowTopBar = showTopBar && scene !== "home";
  const shouldShowBottomNav = showBottomNav && (roomState?.status === "InGame" || roomState?.status === "GameOver");
  const isGameTopBar = shouldShowTopBar && contentDensity === "game" && roomState?.status === "InGame";
  const hasRumorAttention = botSpeechUnreadCount > 0 || Boolean(activeBotSpeech);
  const layout = useMemo(() => getResponsiveMetrics(width, height), [height, width]);
  const horizontalPadding = layout.pagePadding + Math.max(insets.left, insets.right);
  const contentMaxWidth = layout.contentMaxWidth;
  const topBarHeight = layout.topBarBaseHeight + insets.top;
  const bottomNavHeight = layout.bottomNavBaseHeight + insets.bottom;
  const shouldShowTransientBotSpeech =
    roomState?.status === "InGame" &&
    shouldShowBottomNav &&
    !suppressTransientBotSpeech &&
    !rumorsOpen &&
    phase !== "RoleReveal" &&
    phase !== "GameOver";
  const contentTopPadding = contentDensity === "game" ? spacing.sm : spacing.lg;
  const navIconSize = scaledSize(24, layout.controlScale, 21, 25);
  const navSettingsIconSize = scaledSize(22, layout.controlScale, 20, 24);
  const navigateIfReady = (route: "GameOver" | "GameLog" | "GameSettings" | "RoleReveal" | "Night" | "Vote" | "Lobby") => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate(route);
  };
  const goStatus = () => {
    if (isPaused) return;
    if (roomState?.status === "GameOver") {
      navigateIfReady("GameOver");
      return;
    }
    const route = getRouteForCurrentPhase(phase);
    navigateIfReady(route);
  };
  const openRumors = () => {
    markBotSpeechInboxRead();
    setRumorsOpen(true);
  };
  const phaseType = scene === "vote" || scene === "day" ? "day" : scene === "night" || scene === "vampire" || scene === "detective" || scene === "doctor" ? "night" : "other";
  const phaseVisual = phase === "VampireVote" || phase === "HunterLastBreath" ? "blood-candle" : phaseType === "night" ? "candle" : "bar";
  const resolvedBackgroundMode = backgroundMode ?? "solid";

  return (
    <View style={styles.safe}>
      <View style={styles.root}>
        <View pointerEvents="none" style={styles.opaqueBackdrop} />
        <GameBackground variant={scene} backdropScale={backdropScale} mode={resolvedBackgroundMode} />

        {shouldShowTopBar ? (
          <View style={[styles.topBar, isGameTopBar ? styles.topBarGame : null, { height: topBarHeight, paddingTop: insets.top }]}>
            <View
              style={[
                isGameTopBar ? styles.gameTopBarInner : styles.topBarInner,
                {
                  maxWidth: contentMaxWidth,
                  paddingLeft: horizontalPadding,
                  paddingRight: isGameTopBar ? horizontalPadding : Math.max(horizontalPadding, insets.right) + 108
                }
              ]}
            >
              {isGameTopBar ? (
                <InGameTopBar
                  phaseLabel={label}
                  phaseType={phaseType}
                  phaseVisual={phaseVisual}
                  phaseEndsAt={gameState?.phaseEndsAt ?? null}
                  rumorCount={botSpeechUnreadCount}
                  hasRumorAttention={hasRumorAttention}
                  onPressRumors={openRumors}
                />
              ) : (
                <View style={styles.topLeft}>
                  <Ionicons name="shield-outline" size={20} color={colors.primaryBright} />
                  <Text style={styles.topLabel} numberOfLines={1}>{label}</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        <Animated.View
          style={[
            styles.content,
            {
              maxWidth: contentMaxWidth,
              paddingHorizontal: horizontalPadding,
              paddingTop: contentTopPadding + (shouldShowTopBar ? 0 : insets.top),
              opacity: contentOpacity,
              transform: [{ translateY: contentY }]
            }
          ]}
        >
          {keyboardAware ? (
            <KeyboardAvoidingView
              style={styles.keyboardAvoiding}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={keyboardVerticalOffset ?? (shouldShowTopBar ? topBarHeight : insets.top)}
            >
              <ScrollView
                style={styles.keyboardScroll}
                contentContainerStyle={[
                  styles.keyboardScrollContent,
                  keyboardAwareContentContainerStyle,
                  { paddingBottom: keyboardExtraScrollPadding }
                ]}
                keyboardShouldPersistTaps={keyboardShouldPersistTaps}
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            </KeyboardAvoidingView>
          ) : (
            children
          )}
        </Animated.View>
        <BotSpeechOverlay
          bottomOffset={bottomNavHeight + spacing.sm}
          disabled={!shouldShowTransientBotSpeech}
          unreadCount={botSpeechUnreadCount}
          onOpenHistory={openRumors}
        />
        <BotSpeechHistorySheet visible={rumorsOpen} onClose={() => setRumorsOpen(false)} entries={botSpeechHistory} />
        {showConnectionBanner ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.connectionBanner,
              {
                top: shouldShowTopBar ? topBarHeight : insets.top,
                opacity: connectionPulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] })
              }
            ]}
          >
            <View
              style={[
                styles.connectionDot,
                connectionStatus === "error" ? styles.connectionDotError : styles.connectionDotPending
              ]}
            />
            <Text style={styles.connectionText} numberOfLines={1}>
              {connectionStatus === "error" ? "Bağlantı hatası — tekrar deneniyor" : "Bağlantı yeniden kuruluyor"}
            </Text>
          </Animated.View>
        ) : null}
        <GameToast
          topOffset={isGameTopBar ? topBarHeight + 8 : undefined}
        />
        {isPaused && showPauseOverlay ? (
          <View style={[styles.pauseOverlay, { top: shouldShowTopBar ? topBarHeight : 0, bottom: shouldShowBottomNav ? bottomNavHeight : 0 }]}>
            <View style={styles.pausePanel}>
              <Ionicons name="pause-circle-outline" size={42} color={colors.secondary} />
              <Text style={styles.pauseTitle}>Oyun Duraklatıldı</Text>
              <Text style={styles.pauseText}>Süre ve oyuncu aksiyonları host devam ettirene kadar beklemede.</Text>
            </View>
          </View>
        ) : null}

        {shouldShowBottomNav ? (
          <LiquidGlassSurface
            variant="nav"
            radius={0}
            glow
            style={[styles.bottomNav, { height: bottomNavHeight, paddingBottom: Math.max(insets.bottom, 8) }]}
            contentStyle={styles.bottomNavContent}
          >
            <View style={[styles.bottomNavInner, { maxWidth: contentMaxWidth, paddingHorizontal: horizontalPadding }]}>
              <LiquidGlassPressable
                selected={navActive === 0}
                glow={navActive === 0}
                ambientSweep={navActive === 0}
                radius={glassTokens.radius.md}
                style={styles.navItemWrap}
                surfaceStyle={styles.navItem}
                contentStyle={styles.navItemContent}
                variant="nav"
                onPress={goStatus}
              >
                <View style={[styles.navIconWrap, navActive === 0 ? styles.navIconWrapActive : null]}>
                  <Ionicons name="eye-outline" size={navIconSize} color={navActive === 0 ? colors.secondary : "#6e6d72"} />
                  {statusAttention ? <View style={styles.navDotDanger} /> : null}
                </View>
                <Text style={[styles.navLabel, navActive === 0 ? styles.navLabelActive : null]}>Durum</Text>
              </LiquidGlassPressable>
              <LiquidGlassPressable
                selected={navActive === 1}
                glow={navActive === 1}
                ambientSweep={navActive === 1}
                radius={glassTokens.radius.md}
                style={styles.navItemWrap}
                surfaceStyle={styles.navItem}
                contentStyle={styles.navItemContent}
                variant="nav"
                onPress={() => navigateIfReady("GameLog")}
              >
                <View style={[styles.navIconWrap, navActive === 1 ? styles.navIconWrapActive : null]}>
                  <Ionicons name="book-outline" size={navIconSize} color={navActive === 1 ? colors.secondary : "#6e6d72"} />
                  {hasLogAttention ? <View style={styles.navDotInfo} /> : null}
                </View>
                <Text style={[styles.navLabel, navActive === 1 ? styles.navLabelActive : null]}>Günlük</Text>
              </LiquidGlassPressable>
              <LiquidGlassPressable
                selected={navActive === 2}
                glow={navActive === 2}
                ambientSweep={navActive === 2}
                radius={glassTokens.radius.md}
                style={styles.navItemWrap}
                surfaceStyle={styles.navItem}
                contentStyle={styles.navItemContent}
                variant="nav"
                onPress={() => {
                  if (isPaused && !isHost) return;
                  navigateIfReady("GameSettings");
                }}
              >
                <View style={[styles.navIconWrap, navActive === 2 ? styles.navIconWrapActive : null]}>
                  <Ionicons name="settings-outline" size={navSettingsIconSize} color={navActive === 2 ? colors.secondary : "#6e6d72"} />
                </View>
                <Text style={[styles.navLabel, navActive === 2 ? styles.navLabelActive : null]}>Ayarlar</Text>
              </LiquidGlassPressable>
            </View>
          </LiquidGlassSurface>
        ) : null}
      </View>
    </View>
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
  opaqueBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backgroundDeep
  },
  topBar: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(170,137,132,0.16)",
    alignItems: "center",
    justifyContent: "center"
  },
  topBarGame: {
    borderBottomWidth: 0,
    borderBottomColor: "rgba(233,195,73,0.18)",
    backgroundColor: "rgba(8,8,10,0.42)"
  },
  topBarInner: {
    width: "100%",
    flex: 1,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row"
  },
  gameTopBarInner: {
    width: "100%",
    flex: 1,
    alignSelf: "center",
    justifyContent: "center"
  },
  topLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0
  },
  topLabel: {
    flexShrink: 1,
    color: colors.primaryBright,
    fontFamily: typography.serif,
    fontSize: 14,
    letterSpacing: 1.4
  },
  content: {
    flex: 1,
    width: "100%",
    alignSelf: "center"
  },
  keyboardAvoiding: {
    flex: 1
  },
  keyboardScroll: {
    flex: 1
  },
  keyboardScrollContent: {
    flexGrow: 1
  },
  bottomNav: {
    position: "relative",
    height: 74,
    paddingBottom: 8,
    paddingTop: 8,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  bottomNavContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  bottomNavInner: {
    width: "100%",
    flex: 1,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6
  },
  navItemWrap: {
    flex: 1,
    minWidth: 0
  },
  navItem: {
    height: 54
  },
  navItemContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  navIconWrap: {
    width: 26,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.82
  },
  navIconWrapActive: {
    opacity: 1
  },
  navLabel: {
    color: "#6e6d72",
    fontFamily: typography.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center"
  },
  navLabelActive: {
    color: colors.secondary,
    fontFamily: typography.sansBold
  },
  navDotDanger: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(10,10,12,0.9)",
    backgroundColor: colors.primaryBright
  },
  navDotInfo: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(10,10,12,0.9)",
    backgroundColor: colors.secondary
  },
  pauseOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: uiStandard.screen.pagePadding,
    backgroundColor: "rgba(5,5,6,0.78)"
  },
  pausePanel: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.34)",
    borderRadius: 14,
    backgroundColor: "rgba(12,12,14,0.94)",
    padding: spacing.lg,
    alignItems: "center",
    gap: 8
  },
  pauseTitle: {
    color: colors.secondary,
    fontFamily: typography.serif,
    fontSize: 28,
    textAlign: "center"
  },
  pauseText: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    textAlign: "center"
  },
  connectionBanner: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: "rgba(20,12,12,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229,57,53,0.32)"
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  connectionDotPending: {
    backgroundColor: colors.secondary
  },
  connectionDotError: {
    backgroundColor: colors.danger
  },
  connectionText: {
    color: colors.text,
    fontFamily: typography.sansBold,
    fontSize: 11,
    letterSpacing: 0.6
  }
});
