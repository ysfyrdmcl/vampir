import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { emitJoinRoom } from "../socket/runtime";
import { saveNickname } from "../storage/session-storage";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { toFriendlyErrorText } from "../ui/error-text";
import { uiStandard } from "../ui/ui-standard";

type Props = NativeStackScreenProps<RootStackParamList, "JoinRoom">;

export function JoinRoomScreen({ navigation }: Props) {
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const errorCode = useGameStore((s) => s.errorCode);
  const errorText = toFriendlyErrorText(errorCode);

  const roomCodeSlots = useMemo(
    () => Array.from({ length: 6 }, (_, index) => roomCode.trim().toUpperCase()[index] ?? "•"),
    [roomCode]
  );

  const joinRoom = () => {
    const safeRoomCode = roomCode.trim().toUpperCase();
    const safeNickname = nickname.trim();
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
          <Text style={styles.label}>ODA KODU</Text>
          <View style={styles.codeSlots}>
            {roomCodeSlots.map((char, index) => (
              <View key={`${char}-${index}`} style={styles.slot}>
                <Text style={styles.slotChar}>{char}</Text>
              </View>
            ))}
          </View>
          <TextInput
            style={styles.codeInput}
            placeholder="Oda kodu"
            autoCapitalize="characters"
            maxLength={6}
            placeholderTextColor={colors.textDim}
            value={roomCode}
            onChangeText={setRoomCode}
          />

          <Text style={[styles.label, styles.playerLabel]}>OYUNCU ADIN</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Lakapını gir..."
            placeholderTextColor={colors.textDim}
            value={nickname}
            onChangeText={setNickname}
          />
        </View>

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        <PrimaryButton label="Katıl" iconName="log-in-outline" onPress={joinRoom} />
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
