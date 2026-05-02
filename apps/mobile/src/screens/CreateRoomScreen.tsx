import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { emitCreateRoom } from "../socket/runtime";
import { saveNickname } from "../storage/session-storage";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { toFriendlyErrorText } from "../ui/error-text";

type Props = NativeStackScreenProps<RootStackParamList, "CreateRoom">;

export function CreateRoomScreen(_: Props) {
  const [nickname, setNickname] = useState("");
  const errorCode = useGameStore((s) => s.errorCode);
  const errorText = toFriendlyErrorText(errorCode);
  const roomCode = useGameStore((s) => s.roomState?.roomCode ?? s.roomCode);

  const createRoom = () => {
    const value = nickname.trim();
    if (value.length < 2) {
      useGameStore.getState().setErrorCode("NICKNAME_TOO_SHORT");
      return;
    }
    useGameStore.getState().setErrorCode(null);
    void saveNickname(value);
    emitCreateRoom(value);
  };

  return (
    <ScreenShell scene="create" headerTitle="GÜNDÜZ FAZI">
      <View style={styles.root}>
        <Text style={styles.title}>Oda Kur</Text>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>OYUNCU ADIN</Text>
          <TextInput
            style={styles.input}
            placeholder="Lakap gir..."
            placeholderTextColor={colors.textDim}
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="words"
          />
          <Text style={styles.hint}>Oyun minimum 4 oyuncu ile başlar.</Text>
        </View>

        {roomCode ? (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>ODA KODU</Text>
            <Text style={styles.code}>{roomCode}</Text>
          </View>
        ) : null}

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        <PrimaryButton label="Odayı Oluştur" iconName="shield-checkmark-outline" onPress={createRoom} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 14,
    paddingTop: spacing.sm
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 56 / 1.5,
    textAlign: "center"
  },
  formCard: {
    backgroundColor: colors.parchment,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.42)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: 12
  },
  fieldLabel: {
    color: colors.parchmentText,
    fontFamily: typography.sansBold,
    fontSize: typography.label,
    letterSpacing: 2
  },
  input: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(87,69,0,0.5)",
    color: colors.parchmentText,
    fontFamily: typography.serifSemi,
    fontSize: 34 / 1.7
  },
  hint: {
    color: "rgba(52,40,0,0.75)",
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  codeCard: {
    marginTop: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.32)",
    backgroundColor: "rgba(32,31,31,0.92)",
    alignItems: "center",
    paddingVertical: 18,
    gap: 4
  },
  codeLabel: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    letterSpacing: 2,
    fontSize: typography.label
  },
  code: {
    color: colors.secondary,
    fontFamily: typography.serif,
    fontSize: 50 / 1.35,
    letterSpacing: 7
  },
  error: {
    color: colors.danger,
    fontFamily: typography.sansMedium
  }
});
