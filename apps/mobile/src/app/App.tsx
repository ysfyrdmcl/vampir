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
  const roomState = useGameStore((s) => s.roomState);
  const gameState = useGameStore((s) => s.gameState);
  const gameWinner = useGameStore((s) => s.gameWinner);
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
        await new Promise((resolve) => setTimeout(resolve, 1050));
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
    if (!roomState) {
      return null;
    }
    if (roomState.status === "Lobby") {
      return "Lobby" as const;
    }
    if (roomState.status === "GameOver") {
      if (!gameWinner) return null;
      return "GameOver" as const;
    }
    return getRouteForCurrentPhase(gameState?.phase ?? null);
  }, [gameState?.phase, gameWinner, roomState]);

  useEffect(() => {
    if (!targetRoute || !navigationRef.isReady()) {
      return;
    }
    const current = navigationRef.getCurrentRoute()?.name;
    if ((current === "GameLog" || current === "GameSettings" || current === "RoleGuide" || current === "RoleCard") && targetRoute !== "GameOver") {
      return;
    }
    if (current === targetRoute) return;
    const delayMs = targetRoute === "GameOver" ? 450 : 0;
    const timer = setTimeout(() => {
      const latest = navigationRef.getCurrentRoute()?.name;
      if (latest !== targetRoute) {
        navigationRef.navigate(targetRoute);
      }
    }, delayMs);
    return () => clearTimeout(timer);
  }, [targetRoute]);

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
        <PhaseTransitionOverlay phase={gameState?.phase ?? null} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1
  }
});
