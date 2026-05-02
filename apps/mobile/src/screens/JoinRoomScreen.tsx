import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
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

type Props = NativeStackScreenProps<RootStackParamList, "JoinRoom">;

export function JoinRoomScreen(_: Props) {
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

  return (
    <ScreenShell scene="join" headerTitle="GÜNDÜZ FAZI">
      <View style={styles.root}>
        <Text style={styles.title}>Odaya Katıl</Text>
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

          <PrimaryButton label="Katıl" iconName="log-in-outline" onPress={joinRoom} />
        </View>
        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    gap: 14
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 56 / 1.5,
    textAlign: "center"
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.serifRegular,
    fontSize: 19
  },
  card: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 16,
    backgroundColor: colors.surfaceGlass,
    padding: spacing.lg,
    gap: 14
  },
  label: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: typography.label,
    letterSpacing: 2
  },
  codeSlots: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  slot: {
    flex: 1,
    height: 62,
    borderRadius: 8,
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
    height: 44,
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
    height: 54,
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
  }
});
