import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { ConfirmActionSheet } from "../components/ConfirmActionSheet";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { emitGamePause, emitGamePhaseAdvance, emitGameResume, emitLeaveRoom } from "../socket/runtime";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { socketErrorVisibleOnRoute, toFriendlyErrorText } from "../ui/error-text";

type Props = NativeStackScreenProps<RootStackParamList, "GameSettings">;

export function GameSettingsScreen({ navigation }: Props) {
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const roomState = useGameStore((s) => s.roomState);
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const errorCode = useGameStore((s) => s.errorCode);
  const isHost = Boolean(roomState?.hostPlayerId && roomState.hostPlayerId === playerId);
  const canPauseControl = isHost && roomState?.status === "InGame" && gameState?.phase !== "GameOver";
  const isPaused = Boolean(gameState?.isPaused);
  const errorText = toFriendlyErrorText(socketErrorVisibleOnRoute(errorCode, "GameSettings"));
  const showPhaseAdvanceWarning = errorCode === "PHASE_ACTIONS_PENDING";

  useFocusEffect(
    useCallback(() => {
      return () => {
        useGameStore.getState().setErrorCode(null);
      };
    }, [])
  );

  return (
    <ScreenShell
      scene="result"
      bottomNavActiveIndex={2}
      headerTitle="AYARLAR"
      showPauseOverlay={false}
      suppressTransientBotSpeech
      opaqueBackground
    >
      <View style={styles.root}>
        <Text style={styles.title}>Oyun Ayarları</Text>
        <Text style={styles.subtitle}>{canPauseControl ? "Host oyun akışını buradan yönetebilir." : "Bu fazda yalnızca güvenli çıkış kullanılabilir."}</Text>
        {showPhaseAdvanceWarning ? (
          <View style={styles.inlineWarning}>
            <View style={styles.warningIcon}>
              <Ionicons name="hourglass-outline" size={18} color="#ffcc8f" />
            </View>
            <View style={styles.warningCopy}>
              <Text style={styles.warningTitle}>Önce faz görevi tamamlanmalı</Text>
              <Text style={styles.warningBody}>
                Bu faz geçmeden önce ilgili oyuncuların görevini tamamlaması gerekiyor.
              </Text>
            </View>
          </View>
        ) : errorText ? (
          <Text style={styles.error}>{errorText}</Text>
        ) : null}
        {canPauseControl ? (
          <>
            <PrimaryButton
              label={isPaused ? "Oyunu Devam Ettir" : "Oyunu Durdur"}
              iconName={isPaused ? "play-outline" : "pause-outline"}
              variant={isPaused ? "gold" : "charcoal"}
              compact
              onPress={() => {
                if (isPaused) {
                  emitGameResume();
                  return;
                }
                setPauseConfirmOpen(true);
              }}
              style={styles.pauseButton}
            />
            <PrimaryButton
              label="Fazı Geç"
              iconName="play-skip-forward-outline"
              variant="blood"
              compact
              onPress={emitGamePhaseAdvance}
              style={styles.pauseButton}
            />
          </>
        ) : null}
        <PrimaryButton
          label="Odadan Ayrıl"
          iconName="exit-outline"
          variant="danger-outline"
          compact
          onPress={() => setLeaveConfirmOpen(true)}
          style={styles.leaveButton}
        />
      </View>
      <ConfirmActionSheet
        visible={pauseConfirmOpen}
        title="Oyunu durdur?"
        description="Süre ve tüm oyuncu aksiyonları duraklatılacak."
        confirmLabel="Duraklat"
        cancelLabel="Vazgeç"
        variant="charcoal"
        onConfirm={() => {
          setPauseConfirmOpen(false);
          emitGamePause();
        }}
        onCancel={() => setPauseConfirmOpen(false)}
      />
      <ConfirmActionSheet
        visible={leaveConfirmOpen}
        title="Odadan ayrıl?"
        description="Odadan ayrılırsan tekrar katılmak için oda kodunu kullanman gerekir."
        confirmLabel="Odadan Ayrıl"
        cancelLabel="Vazgeç"
        variant="danger"
        onConfirm={() => {
          setLeaveConfirmOpen(false);
          emitLeaveRoom();
          navigation.navigate("Welcome");
        }}
        onCancel={() => setLeaveConfirmOpen(false)}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 12,
    justifyContent: "center"
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 32,
    textAlign: "center"
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.sansMedium,
    marginBottom: spacing.sm
  },
  error: {
    color: colors.danger,
    textAlign: "center",
    fontFamily: typography.sansMedium,
    fontSize: 13,
    lineHeight: 18
  },
  inlineWarning: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(255,184,108,0.38)",
    borderRadius: 14,
    backgroundColor: "rgba(34,18,14,0.96)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start"
  },
  warningIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,184,108,0.32)",
    backgroundColor: "rgba(76,36,22,0.78)",
    alignItems: "center",
    justifyContent: "center"
  },
  warningCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3
  },
  warningTitle: {
    color: "#ffcc8f",
    fontFamily: typography.sansBold,
    fontSize: 13,
    lineHeight: 17
  },
  warningBody: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    flexShrink: 1
  },
  pauseButton: {
    alignSelf: "center",
    minWidth: 188,
    maxWidth: 236,
    width: "64%"
  },
  leaveButton: {
    alignSelf: "center",
    minWidth: 176,
    maxWidth: 220,
    width: "58%"
  }
});
