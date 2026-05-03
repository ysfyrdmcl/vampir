import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { emitJoinRoom } from "../socket/runtime";
import { loadLastRoomCode, loadNickname, saveLastRoomCode, saveNickname } from "../storage/session-storage";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { toFriendlyErrorText } from "../ui/error-text";
import { uiStandard } from "../ui/ui-standard";

type Props = NativeStackScreenProps<RootStackParamList, "JoinRoom">;

export function JoinRoomScreen({ navigation, route }: Props) {
  const codeInputRef = useRef<TextInput>(null);
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [lastRoomCode, setLastRoomCode] = useState<string | null>(null);
  const errorCode = useGameStore((s) => s.errorCode);
  const errorText = toFriendlyErrorText(errorCode);
  const safeRoomCode = roomCode.trim().toUpperCase();
  const safeNickname = nickname.trim();
  const canJoin = safeRoomCode.length >= 4 && safeNickname.length >= 2;

  const roomCodeSlots = useMemo(
    () => Array.from({ length: 6 }, (_, index) => safeRoomCode[index] ?? "•"),
    [safeRoomCode]
  );

  useEffect(() => {
    codeInputRef.current?.focus();
    void Promise.all([loadLastRoomCode(), loadNickname()]).then(([storedRoomCode, storedNickname]) => {
      if (storedRoomCode) setLastRoomCode(storedRoomCode);
      if (storedNickname) setNickname(storedNickname);
    });
  }, []);

  useEffect(() => {
    if (!route.params?.scannedCode) return;
    normalizeRoomCode(route.params.scannedCode);
    navigation.setParams({ scannedCode: undefined });
  }, [navigation, route.params?.scannedCode]);

  const normalizeRoomCode = (value: string) => {
    setRoomCode(value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase());
  };

  const pasteRoomCode = async () => {
    const text = await Clipboard.getStringAsync();
    const match = text.toUpperCase().match(/[A-Z0-9]{4,6}/);
    if (match) normalizeRoomCode(match[0]);
  };

  const joinRoom = () => {
    if (safeRoomCode.length < 4) {
      useGameStore.getState().setErrorCode("ROOM_CODE_INVALID");
      return;
    }
    if (safeNickname.length < 2) {
      useGameStore.getState().setErrorCode("NICKNAME_TOO_SHORT");
      return;
    }
    useGameStore.getState().setErrorCode(null);
    void saveNickname(safeNickname);
    void saveLastRoomCode(safeRoomCode);
    emitJoinRoom(safeRoomCode, safeNickname);
  };

  const goBackToMenu = () => {
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  return (
    <ScreenShell scene="join" headerTitle="ODAYA KATIL">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Karanlık meclise davet edildin.</Text>

        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>ODA KODU</Text>
            <Pressable style={styles.pasteButton} onPress={pasteRoomCode}>
              <Text style={styles.pasteButtonText}>Yapıştır</Text>
            </Pressable>
          </View>
          <View style={styles.codeSlots}>
            {roomCodeSlots.map((char, index) => (
              <View key={`${char}-${index}`} style={styles.slot}>
                <Text style={styles.slotChar}>{char}</Text>
              </View>
            ))}
          </View>
          <TextInput
            ref={codeInputRef}
            style={styles.codeInput}
            placeholder="Oda kodu"
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="ascii-capable"
            maxLength={6}
            placeholderTextColor={colors.textDim}
            value={roomCode}
            onChangeText={normalizeRoomCode}
            textContentType="oneTimeCode"
          />
          <View style={styles.quickActions}>
            {lastRoomCode ? (
              <Pressable style={styles.quickChip} onPress={() => normalizeRoomCode(lastRoomCode)}>
                <Text style={styles.quickChipText}>Son oda: {lastRoomCode}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.quickChipMuted} onPress={() => navigation.navigate("QrScanner")}>
              <Text style={styles.quickChipMutedText}>QR Tara</Text>
            </Pressable>
          </View>

          <Text style={[styles.label, styles.playerLabel]}>OYUNCU ADIN</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Lakapını gir..."
            placeholderTextColor={colors.textDim}
            value={nickname}
            onChangeText={setNickname}
            returnKeyType="join"
            onSubmitEditing={joinRoom}
          />
        </View>

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        <PrimaryButton label="Katıl" iconName="log-in-outline" onPress={joinRoom} disabled={!canJoin} />
        <PrimaryButton
          label="Menüye Dön"
          iconName="arrow-back-outline"
          variant="outline"
          onPress={goBackToMenu}
          style={styles.backButton}
        />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    gap: uiStandard.screen.pageGap,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.serifRegular,
    fontSize: uiStandard.text.heroSubtitleSize
  },
  card: {
    borderWidth: 1,
    borderColor: uiStandard.surfaces.panel.borderColor,
    borderRadius: uiStandard.screen.cardRadius,
    backgroundColor: uiStandard.surfaces.panel.backgroundColor,
    paddingHorizontal: uiStandard.screen.cardPaddingX,
    paddingVertical: uiStandard.screen.cardPaddingY,
    gap: uiStandard.screen.sectionGap
  },
  label: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: uiStandard.text.sectionLabelSize,
    letterSpacing: uiStandard.text.labelSpacing
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  pasteButton: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.34)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(36,31,20,0.68)"
  },
  pasteButtonText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 11
  },
  codeSlots: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  slot: {
    flex: 1,
    height: uiStandard.screen.codeSlotHeight,
    borderRadius: uiStandard.screen.codeSlotRadius,
    backgroundColor: "rgba(5,7,10,0.92)",
    borderBottomWidth: 2,
    borderBottomColor: "rgba(233,195,73,0.55)",
    alignItems: "center",
    justifyContent: "center"
  },
  slotChar: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 30
  },
  codeInput: {
    height: uiStandard.screen.compactInputHeight,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(233,195,73,0.25)",
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 14,
    letterSpacing: 1.2
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  quickChip: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.28)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(12,12,14,0.72)"
  },
  quickChipText: {
    color: colors.secondary,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  quickChipMuted: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.2)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(12,12,14,0.42)"
  },
  quickChipMutedText: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  playerLabel: {
    marginTop: 2
  },
  nameInput: {
    height: uiStandard.screen.inputHeight,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(233,195,73,0.4)",
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 31 / 1.6
  },
  error: {
    color: colors.danger,
    fontFamily: typography.sansMedium,
    textAlign: "center"
  },
  backButton: {
    marginTop: 10
  }
});
