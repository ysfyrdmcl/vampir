import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
import { uiStandard } from "../ui/ui-standard";

type Props = NativeStackScreenProps<RootStackParamList, "CreateRoom">;

export function CreateRoomScreen({ navigation }: Props) {
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

  const goBackToMenu = () => {
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  return (
    <ScreenShell scene="create" headerTitle="ODA KUR">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Karanlık meclisi başlat.</Text>
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
  formCard: {
    backgroundColor: uiStandard.surfaces.parchment.backgroundColor,
    borderRadius: uiStandard.screen.cardRadius,
    borderWidth: 1,
    borderColor: uiStandard.surfaces.parchment.borderColor,
    paddingHorizontal: uiStandard.screen.cardPaddingX,
    paddingVertical: uiStandard.screen.cardPaddingY,
    gap: uiStandard.screen.sectionGap
  },
  fieldLabel: {
    color: colors.parchmentText,
    fontFamily: typography.sansBold,
    fontSize: uiStandard.text.sectionLabelSize,
    letterSpacing: uiStandard.text.labelSpacing
  },
  input: {
    height: uiStandard.screen.inputHeight,
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
    borderRadius: uiStandard.screen.panelRadius,
    borderWidth: 1,
    borderColor: uiStandard.surfaces.code.borderColor,
    backgroundColor: uiStandard.surfaces.code.backgroundColor,
    alignItems: "center",
    paddingVertical: 18,
    gap: 4
  },
  codeLabel: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    letterSpacing: uiStandard.text.labelSpacing,
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
  },
  backButton: {
    marginTop: 10
  }
});
