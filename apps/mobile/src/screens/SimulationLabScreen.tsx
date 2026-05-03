import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { startBatchSimulation } from "../socket/runtime";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "SimulationLab">;
type AllowedPlayers = 4 | 6 | 8 | 10;

const PLAYER_OPTIONS: AllowedPlayers[] = [4, 6, 8, 10];
const GAME_COUNT_OPTIONS = [10, 25, 50, 100];

export function SimulationLabScreen({ navigation }: Props) {
  const [playerCount, setPlayerCount] = useState<AllowedPlayers>(4);
  const [gameCount, setGameCount] = useState<number>(25);
  const [resultText, setResultText] = useState<string>("");
  const [running, setRunning] = useState(false);

  const header = useMemo(() => `${playerCount} Kişi • ${gameCount} Oyun`, [playerCount, gameCount]);

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      const summary = startBatchSimulation(playerCount, gameCount);
      const text = [
        `Toplam: ${summary.totalGames}`,
        `Köylü Kazanımı: ${summary.villagerWins}`,
        `Vampir Kazanımı: ${summary.vampireWins}`,
        `Sonuçsuz (limit): ${summary.unresolvedGames}`,
        `Ortalama Tur: ${summary.averageRounds}`,
        `Tie Round Sayısı: ${summary.tieRounds}`,
        `Şüpheli Bayraklar: ${summary.suspiciousFlags.length ? summary.suspiciousFlags.join(", ") : "Yok"}`
      ].join("\n");
      setResultText(text);
      setRunning(false);
    }, 20);
  };

  return (
    <ScreenShell scene="home" headerTitle="SİMÜLASYON">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Otomatik Oyun Simülasyonu</Text>
        <Text style={styles.subtitle}>Senaryo: {header}</Text>
        <Text style={styles.devHint}>Geliştirici ekranı. Canlı oyuncu deneyiminden ayrı tutulur.</Text>

        <Text style={styles.sectionTitle}>Oyuncu Sayısı</Text>
        <View style={styles.row}>
          {PLAYER_OPTIONS.map((opt) => (
            <Pressable key={opt} onPress={() => setPlayerCount(opt)} style={[styles.chip, playerCount === opt ? styles.chipActive : null]}>
              <Text style={[styles.chipText, playerCount === opt ? styles.chipTextActive : null]}>{opt}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Simüle Edilecek Oyun</Text>
        <View style={styles.row}>
          {GAME_COUNT_OPTIONS.map((opt) => (
            <Pressable key={opt} onPress={() => setGameCount(opt)} style={[styles.chip, gameCount === opt ? styles.chipActive : null]}>
              <Text style={[styles.chipText, gameCount === opt ? styles.chipTextActive : null]}>{opt}</Text>
            </Pressable>
          ))}
        </View>

        <PrimaryButton
          label={running ? "Simülasyon Çalışıyor..." : "Simülasyonu Başlat"}
          iconName="play-outline"
          onPress={run}
          disabled={running}
        />
        <PrimaryButton label="Menüye Dön" iconName="arrow-back-outline" variant="ghost" compact onPress={() => navigation.navigate("Welcome")} />

        <View style={styles.logCard}>
          <Text style={styles.logTitle}>Son Özet</Text>
          <Text style={styles.logText}>{resultText || "Henüz simülasyon çalıştırılmadı."}</Text>
          <Text style={styles.logHint}>Detaylar `GAMELOG` altında `sim.*` eventleri olarak yazılır.</Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xl, gap: 12 },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 34,
    textAlign: "center"
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 14,
    textAlign: "center"
  },
  devHint: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    textAlign: "center"
  },
  sectionTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 13,
    letterSpacing: 1.2,
    marginTop: 4
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  chip: {
    minWidth: 62,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.35)",
    backgroundColor: "rgba(12,12,14,0.8)"
  },
  chipActive: {
    backgroundColor: colors.parchment,
    borderColor: colors.primaryBright
  },
  chipText: {
    color: colors.text,
    fontFamily: typography.sansBold,
    fontSize: 14
  },
  chipTextActive: {
    color: colors.parchmentText
  },
  logCard: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.35)",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "rgba(12,12,14,0.75)",
    gap: 8
  },
  logTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 14
  },
  logText: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    lineHeight: 20
  },
  logHint: {
    color: colors.textDim,
    fontFamily: typography.sans,
    fontSize: 12
  }
});
