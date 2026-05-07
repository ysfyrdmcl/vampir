import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { LiquidGlassChip, LiquidGlassSurface } from "../glass";
import { emitCreateRoom } from "../socket/runtime";
import { saveNickname } from "../storage/session-storage";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { socketErrorAllowedForRoute, socketErrorVisibleOnRoute, toFriendlyErrorText } from "../ui/error-text";
import { uiStandard } from "../ui/ui-standard";

type Props = NativeStackScreenProps<RootStackParamList, "CreateRoom">;

export function CreateRoomScreen({ navigation }: Props) {
  const [nickname, setNickname] = useState("");
  const [isInputFocused, setInputFocused] = useState(false);
  const errorCode = useGameStore((s) => s.errorCode);
  const errorText = toFriendlyErrorText(socketErrorVisibleOnRoute(errorCode, "CreateRoom"));
  const roomCode = useGameStore((s) => s.roomState?.roomCode ?? s.roomCode);
  const createDisabledReason = nickname.trim().length < 2 ? "Oyuncu adını gir" : null;

  useFocusEffect(
    useCallback(() => {
      const code = useGameStore.getState().errorCode;
      if (code && !socketErrorAllowedForRoute(code, "CreateRoom")) {
        useGameStore.getState().setErrorCode(null);
      }
    }, [])
  );

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
    useGameStore.getState().setErrorCode(null);
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  return (
    <ScreenShell scene="create" headerTitle="ODA KUR">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LiquidGlassSurface variant="hero" glow radius={uiStandard.screen.cardRadius} style={styles.introCard} contentStyle={styles.introCardContent}>
          <View style={styles.introIcon}>
            <Ionicons name="git-network-outline" size={26} color={colors.secondary} />
          </View>
          <Text style={styles.kicker}>HOST ODASI</Text>
          <Text style={styles.title}>Karanlık meclisi sen başlat.</Text>
          <Text style={styles.introText}>Oyuncu adını seç, oda kodunu oluştur ve masadaki herkesi aynı lobiye al.</Text>
          <View style={styles.introChips}>
            <LiquidGlassChip iconName="people-outline" label="4+ oyuncu" style={styles.introChip} textStyle={styles.introChipText} />
            <LiquidGlassChip iconName="shield-outline" label="Host kontrolü" style={styles.introChip} textStyle={styles.introChipText} />
          </View>
        </LiquidGlassSurface>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>OYUNCU ADIN</Text>
          <TextInput
            style={[styles.input, isInputFocused ? styles.inputFocused : null]}
            placeholder="Lakabını yaz"
            placeholderTextColor="rgba(55,47,35,0.58)"
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="words"
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
        </View>

        {roomCode ? (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>ODA KODU</Text>
            <Text style={styles.code}>{roomCode}</Text>
          </View>
        ) : null}

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        <PrimaryButton label="Odayı Oluştur" iconName="shield-checkmark-outline" onPress={createRoom} disabled={Boolean(createDisabledReason)} />
        {createDisabledReason ? <Text style={styles.disabledHint}>{createDisabledReason}</Text> : null}
        <PrimaryButton
          label="Menüye Dön"
          iconName="arrow-back-outline"
          variant="ghost"
          compact
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
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm
  },
  introCard: {
  },
  introCardContent: {
    flex: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
    gap: 9
  },
  introIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.34)",
    backgroundColor: "rgba(38,28,18,0.62)",
    alignItems: "center",
    justifyContent: "center"
  },
  kicker: {
    color: colors.primaryBright,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 1.8
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 28,
    textAlign: "center"
  },
  introText: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  },
  introChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 2
  },
  introChip: {
    minWidth: 112
  },
  introChipText: {
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  formCard: {
    backgroundColor: uiStandard.surfaces.parchment.backgroundColor,
    borderRadius: uiStandard.screen.panelRadius,
    borderWidth: 1,
    borderColor: uiStandard.surfaces.parchment.borderColor,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  fieldLabel: {
    color: colors.parchmentText,
    fontFamily: typography.sansBold,
    fontSize: uiStandard.text.sectionLabelSize,
    letterSpacing: uiStandard.text.labelSpacing
  },
  input: {
    height: uiStandard.screen.compactInputHeight + 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(87,69,0,0.42)",
    backgroundColor: "rgba(255,248,232,0.48)",
    color: colors.parchmentText,
    fontFamily: typography.serifSemi,
    fontSize: 18,
    paddingHorizontal: 13
  },
  inputFocused: {
    borderColor: "rgba(127,90,9,0.82)",
    backgroundColor: "rgba(255,251,240,0.78)"
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
  disabledHint: {
    marginTop: -6,
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    textAlign: "center"
  },
  backButton: {
    marginTop: 2
  }
});
