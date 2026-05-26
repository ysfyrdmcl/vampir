import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_700Bold
} from "@expo-google-fonts/manrope";
import {
  Newsreader_400Regular,
  Newsreader_600SemiBold,
  Newsreader_700Bold
} from "@expo-google-fonts/newsreader";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BootSplash } from "../components/BootSplash";
import { PhaseTransitionOverlay } from "../components/PhaseTransitionOverlay";
import { PrivateInfoNudge } from "../components/PrivateInfoNudge";
import { logGameEvent } from "../logging/game-logger";
import { connectSocket, emitJoinRoom, initSocketRuntime } from "../socket/runtime";
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
  const roomStatus = useGameStore((s) => s.roomState?.status ?? null);
  const phase = useGameStore((s) => s.gameState?.phase ?? null);
  const gameWinner = useGameStore((s) => s.gameWinner);
  const hasActiveResultEvent = useGameStore((s) => Boolean(s.activeResultEvent));
  const [bootstrapDone, setBootstrapDone] = useState(false);

  const [fontsLoaded] = useFonts({
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
        const currentDeviceId = (await loadDeviceId()) ?? createDeviceId();
        await saveDeviceId(currentDeviceId);
        useGameStore.getState().setDeviceId(currentDeviceId);

        const token = await loadSessionToken();
        const roomCode = await loadLastRoomCode();
        const savedNickname = await loadNickname();

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
        await new Promise((resolve) => setTimeout(resolve, 2050));
        if (isMounted) {
          setBootstrapDone(true);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
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
    if (!targetRoute || !navigationRef.isReady()) {
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
        navigationRef.navigate(targetRoute);
      }
    }, delayMs);
    return () => clearTimeout(timer);
  }, [hasActiveResultEvent, targetRoute]);

  if (!fontsLoaded || !bootstrapDone) {
    return (
      <SafeAreaProvider>
        <BootSplash />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View style={styles.appRoot}>
        <RootNavigator />
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
