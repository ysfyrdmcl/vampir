import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { Newsreader_400Regular } from "@expo-google-fonts/newsreader/400Regular";
import { Newsreader_600SemiBold } from "@expo-google-fonts/newsreader/600SemiBold";
import { Newsreader_700Bold } from "@expo-google-fonts/newsreader/700Bold";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BootSplash } from "../components/BootSplash";
import { PhaseTransitionOverlay } from "../components/PhaseTransitionOverlay";
import { PrivateInfoNudge } from "../components/PrivateInfoNudge";
import { logGameEvent } from "../logging/game-logger";
import { MotionPreferencesProvider } from "../motion/MotionPreferences";
import { connectSocket, emitJoinRoom, initSocketRuntime, resumeSocket } from "../socket/runtime";
import { loadDeviceId, loadLastRoomCode, loadNickname, loadSessionToken, saveDeviceId } from "../storage/session-storage";
import { getRouteForCurrentPhase, useGameStore } from "../store/game-store";
import { createDeviceId } from "../utils/device-id";
import { RootNavigator } from "./navigation/RootNavigator";
import { navigationRef } from "./navigation/navigation-ref";

function configureStableTextScale() {
  const textConfig = Text as typeof Text & { defaultProps?: TextProps };
  const inputConfig = TextInput as typeof TextInput & { defaultProps?: TextInputProps };
  textConfig.defaultProps = { ...textConfig.defaultProps, allowFontScaling: false };
  inputConfig.defaultProps = { ...inputConfig.defaultProps, allowFontScaling: false };
}

configureStableTextScale();

export default function App() {
  return <MotionPreferencesProvider><AppContent /></MotionPreferencesProvider>;
}

function AppContent() {
  const roomStatus = useGameStore((s) => s.roomState?.status ?? null);
  const phase = useGameStore((s) => s.gameState?.phase ?? null);
  const gameWinner = useGameStore((s) => s.gameWinner);
  const hasActiveResultEvent = useGameStore((s) => Boolean(s.activeResultEvent));
  const [bootstrapDone, setBootstrapDone] = useState(false);

  const [navigationReady, setNavigationReady] = useState(false);
  const [currentRouteName, setCurrentRouteName] = useState<string>();
  const updateCurrentRoute = useCallback(() => {
    setCurrentRouteName(navigationRef.getCurrentRoute()?.name);
  }, []);
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_600SemiBold,
    Newsreader_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold
  });

  useEffect(() => {
    initSocketRuntime();
    connectSocket();
    logGameEvent("app.init");
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const [storedDeviceId, token, roomCode, savedNickname] = await Promise.all([
          loadDeviceId(), loadSessionToken(), loadLastRoomCode(), loadNickname()
        ]);
        const currentDeviceId = storedDeviceId ?? createDeviceId();
        if (!storedDeviceId) await saveDeviceId(currentDeviceId);
        if (!isMounted) return;
        useGameStore.getState().setDeviceId(currentDeviceId);

        useGameStore.getState().restoreSession({
          playerSessionToken: token,
          roomCode
        });

        if (savedNickname) {
          useGameStore.getState().setNickname(savedNickname);
        }

        if (roomCode) {
          emitJoinRoom(roomCode, savedNickname ?? "Oyuncu", "bootstrap");
        }
        logGameEvent("app.bootstrap.done", {
          deviceId: currentDeviceId,
          hasStoredRoom: Boolean(roomCode),
          nickname: savedNickname ?? null
        });
      } catch (_error) {
        useGameStore.getState().setErrorCode("BOOTSTRAP_FAILED");
        logGameEvent("app.bootstrap.error");
      } finally {
        if (isMounted) {
          setBootstrapDone(true);
        }
      }
    };

    void bootstrap();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && useGameStore.getState().deviceId) resumeSocket();
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const targetRoute = useMemo(() => {
    if (!roomStatus) {
      return null;
    }
    if (roomStatus === "Lobby") {
      return "Lobby" as const;
    }
    if (roomStatus === "GameOver") {
      if (!gameWinner) return null;
      return "GameOver" as const;
    }
    return getRouteForCurrentPhase(phase);
  }, [gameWinner, phase, roomStatus]);

  useEffect(() => {
    if (!targetRoute || !navigationReady || !navigationRef.isReady()) {
      return;
    }
    const current = navigationRef.getCurrentRoute()?.name;
    if ((current === "GameLog" || current === "GameSettings" || current === "RoleGuide" || current === "RoleCard") && targetRoute !== "GameOver") {
      return;
    }
    if (current === targetRoute) return;
    const delayMs =
      targetRoute === "GameOver"
        ? hasActiveResultEvent
          ? 5400
          : 450
        : current === "RoleReveal" && targetRoute === "Night"
          ? 520
          : 0;
    const timer = setTimeout(() => {
      const latest = navigationRef.getCurrentRoute()?.name;
      if (latest !== targetRoute) {
        navigationRef.reset({ index: 0, routes: [{ name: targetRoute }] });
      }
    }, delayMs);
    return () => clearTimeout(timer);
  }, [hasActiveResultEvent, targetRoute, navigationReady, currentRouteName]);

  if ((!fontsLoaded && !fontError) || !bootstrapDone) {
    return (
      <SafeAreaProvider>
        <BootSplash />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.appRoot}>
        <RootNavigator onReady={() => { setNavigationReady(true); updateCurrentRoute(); }} onStateChange={updateCurrentRoute} />
        <PhaseTransitionOverlay phase={phase} />
        <PrivateInfoNudge />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1
  }
});
