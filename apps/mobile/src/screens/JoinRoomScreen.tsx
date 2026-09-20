import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { LiquidGlassChip, LiquidGlassSurface, glassTokens } from "../glass";
import { emitJoinRoom } from "../socket/runtime";
import { loadLastRoomCode, loadNickname, saveNickname } from "../storage/session-storage";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { socketErrorVisibleOnRoute, toFriendlyErrorText } from "../ui/error-text";
import { uiStandard } from "../ui/ui-standard";
import { showToast } from "../ui/toast-store";
import { roomCodeFromClipboard } from "../utils/room-code";

type Props = NativeStackScreenProps<RootStackParamList, "JoinRoom">;

export function JoinRoomScreen({ navigation }: Props) {
  const codeInputRef = useRef<TextInput>(null);
  const nicknameInputRef = useRef<TextInput>(null);
  const [codeFocused, setCodeFocused] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [lastRoomCode, setLastRoomCode] = useState<string | null>(null);
  const errorCode = useGameStore((s) => s.errorCode);
  const errorText = toFriendlyErrorText(socketErrorVisibleOnRoute(errorCode, "JoinRoom"));
  const safeRoomCode = roomCode.trim().toUpperCase();
  const safeNickname = nickname.trim();
  const joinDisabledReason = safeRoomCode.length < 6 ? "6 haneli oda kodu gir" : safeNickname.length < 2 ? "Oyuncu adını gir" : null;
  const canJoin = !joinDisabledReason;

  const roomCodeSlots = useMemo(
    () => Array.from({ length: 6 }, (_, index) => safeRoomCode[index] ?? "•"),
    [safeRoomCode]
  );

  useEffect(() => {
    void Promise.all([loadLastRoomCode(), loadNickname()]).then(([storedRoomCode, storedNickname]) => {
      if (storedRoomCode) setLastRoomCode(storedRoomCode);
      if (storedNickname) setNickname(storedNickname);
    });
  }, []);

  const normalizeRoomCode = (value: string) => {
    setRoomCode(value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase());
  };

  const pasteRoomCode = async () => {
    try {
      const code = roomCodeFromClipboard(await Clipboard.getStringAsync());
      if (code) normalizeRoomCode(code);
      else showToast("Panoda 6 haneli oda kodu bulunamadı.", "danger", 2500);
    } catch {
      showToast("Panoya erişilemedi. Oda kodunu elle yazabilirsin.", "danger", 2500);
    }
  };

  const joinRoom = () => {
    if (safeRoomCode.length < 6) {
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
    useGameStore.getState().setErrorCode(null);
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  return (
    <ScreenShell
      scene="join"
      headerTitle="ODAYA KATIL"
      keyboardAware
      keyboardExtraScrollPadding={spacing.xxl + spacing.lg}
      keyboardAwareContentContainerStyle={styles.content}
    >
      <LiquidGlassSurface variant="hero" glow radius={uiStandard.screen.cardRadius} style={styles.introCard} contentStyle={styles.introCardContent}>
        <View style={styles.introIcon}>
          <Ionicons name="people-outline" size={26} color={colors.secondary} />
        </View>
        <Text style={styles.kicker}>DAVET ODASI</Text>
        <Text style={styles.title}>Masada yerini al.</Text>
        <Text style={styles.introText}>Arkadaşından aldığın 6 haneli kodu ve adını yaz.</Text>
        <View style={styles.introChips}>
          <LiquidGlassChip iconName="clipboard-outline" label="Yapıştır" onPress={pasteRoomCode} style={styles.introChip} textStyle={styles.introChipText} />
          {lastRoomCode ? (
            <LiquidGlassChip iconName="time-outline" label={`Son oda: ${lastRoomCode}`} onPress={() => normalizeRoomCode(lastRoomCode)} style={styles.introChip} textStyle={styles.introChipText} />
          ) : null}
        </View>
      </LiquidGlassSurface>

      <LiquidGlassSurface variant="panel" radius={uiStandard.screen.cardRadius} style={styles.card} contentStyle={styles.cardContent}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>ODA KODU</Text>
        </View>
        <View style={styles.codeEntry}>
          <Pressable accessible={false} style={styles.codeSlots} onPress={() => codeInputRef.current?.focus()}>
            {roomCodeSlots.map((char, index) => (
              <View key={`${char}-${index}`} style={[styles.slot, codeFocused && Math.min(safeRoomCode.length, 5) === index ? styles.slotActive : null, char !== "•" ? styles.slotFilled : null]}>
                <Text style={[styles.slotChar, char === "•" ? styles.slotPlaceholder : null]}>{char}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={codeInputRef}
            accessibilityLabel="6 haneli oda kodu"
            onFocus={() => setCodeFocused(true)}
            onBlur={() => setCodeFocused(false)}
            returnKeyType="next"
            onSubmitEditing={() => nicknameInputRef.current?.focus()}
            style={styles.hiddenCodeInput}
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="ascii-capable"
            maxLength={6}
            value={roomCode}
            onChangeText={normalizeRoomCode}
            textContentType="oneTimeCode"
            caretHidden
          />
        </View>

        <Text style={[styles.label, styles.playerLabel]}>OYUNCU ADIN</Text>
        <TextInput
          ref={nicknameInputRef}
          accessibilityLabel="Oyuncu adın"
          autoCapitalize="words"
          style={styles.nameInput}
          placeholder="Lakabını yaz"
          placeholderTextColor="rgba(203,194,188,0.44)"
          value={nickname}
          onChangeText={setNickname}
          returnKeyType="join"
          onSubmitEditing={joinRoom}
        />
      </LiquidGlassSurface>

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      <PrimaryButton label="Katıl" iconName="log-in-outline" onPress={joinRoom} disabled={!canJoin} />
      {!canJoin ? <Text style={styles.disabledHint}>{joinDisabledReason}</Text> : null}
      <PrimaryButton
        label="Menüye Dön"
        iconName="arrow-back-outline"
        variant="ghost"
        compact
        onPress={goBackToMenu}
        style={styles.backButton}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm
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
    minWidth: 98
  },
  introChipText: {
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  card: {
  },
  cardContent: {
    flex: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md
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
    justifyContent: "flex-start",
    gap: 10
  },
  codeEntry: {
    position: "relative"
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
    backgroundColor: glassTokens.fill.obsidian,
    borderWidth: 1,
    borderColor: "rgba(255,232,178,0.10)",
    borderBottomWidth: 2,
    borderBottomColor: "rgba(234,194,86,0.46)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: glassTokens.shadow.floatingDark,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  slotActive: {
    borderColor: glassTokens.edge.gold,
    shadowColor: glassTokens.shadow.warmGlow,
    shadowOpacity: 0.42
  },
  slotFilled: {
    backgroundColor: "rgba(90,24,28,0.24)",
    borderColor: "rgba(166,34,42,0.36)"
  },
  slotChar: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 30
  },
  slotPlaceholder: {
    color: "rgba(203,194,188,0.34)"
  },
  hiddenCodeInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
    color: "transparent"
  },
  playerLabel: {
    marginTop: 2
  },
  nameInput: {
    height: uiStandard.screen.compactInputHeight + 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(234,194,86,0.30)",
    backgroundColor: "rgba(8,8,12,0.56)",
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 18,
    paddingHorizontal: 13
  },
  error: {
    color: colors.danger,
    fontFamily: typography.sansMedium,
    textAlign: "center"
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
