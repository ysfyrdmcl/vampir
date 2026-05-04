import Ionicons from "@expo/vector-icons/Ionicons";
import type { BotIntelligence, RoomPlayerView } from "@vampir-koylu/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { PrimaryButton } from "./PrimaryButton";

const INTELLIGENCE_OPTIONS: { key: BotIntelligence; label: string; hint: string }[] = [
  { key: "random", label: "Rastgele", hint: "Tahmin edilemez, mantığı zayıf." },
  { key: "balanced", label: "Dengeli", hint: "Makul karar verir, tutarlı oynar." },
  { key: "deceptive", label: "Kurnaz", hint: "Manipülatif, ikna edici davranır." }
];

export function botIntelligenceLabel(value: BotIntelligence | undefined): string {
  if (value === "random") return "Rastgele";
  if (value === "deceptive") return "Kurnaz";
  return "Dengeli";
}

interface BotControlCardProps {
  bots: RoomPlayerView[];
  intelligence: BotIntelligence;
  onSelectIntelligence: (intelligence: BotIntelligence) => void;
  onAddBot: () => void;
  onFillMinimum: () => void;
  onRemoveBot: (botPlayerId: string) => void;
  playersNeeded: number;
}

export function BotControlCard({
  bots,
  intelligence,
  onSelectIntelligence,
  onAddBot,
  onFillMinimum,
  onRemoveBot,
  playersNeeded
}: BotControlCardProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Ionicons name="hardware-chip-outline" size={20} color={colors.secondary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Bot Oyuncular</Text>
          <Text style={styles.subtitle}>Eksik oyuncu varsa botla tamamlayabilirsin.</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Bot Zekâsı</Text>
      <View style={styles.intelRow}>
        {INTELLIGENCE_OPTIONS.map((option) => {
          const isActive = intelligence === option.key;
          return (
            <Pressable
              key={option.key}
              style={[styles.intelChip, isActive ? styles.intelChipActive : null]}
              onPress={() => onSelectIntelligence(option.key)}
            >
              <Text style={[styles.intelChipText, isActive ? styles.intelChipTextActive : null]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.intelHint}>{INTELLIGENCE_OPTIONS.find((o) => o.key === intelligence)?.hint ?? ""}</Text>

      <View style={styles.actionsRow}>
        <PrimaryButton label="+ Bot Ekle" iconName="add-circle-outline" variant="gold" compact onPress={onAddBot} />
        <PrimaryButton
          label={playersNeeded > 0 ? `Minimuma Tamamla (+${playersNeeded})` : "Minimuma Tamamla"}
          iconName="people-outline"
          variant="charcoal"
          compact
          onPress={onFillMinimum}
          disabled={playersNeeded === 0}
        />
      </View>

      {bots.length > 0 ? (
        <View style={styles.botList}>
          <Text style={styles.sectionLabel}>Oyundaki Botlar</Text>
          {bots.map((bot) => (
            <View key={bot.playerId} style={styles.botRow}>
              <View style={styles.botRowText}>
                <Text style={styles.botName} numberOfLines={1}>{bot.nickname}</Text>
                <Text style={styles.botMeta}>BOT · {botIntelligenceLabel(bot.botIntelligence)}</Text>
              </View>
              <PrimaryButton
                label="Çıkar"
                iconName="trash-outline"
                variant="danger-outline"
                compact
                onPress={() => onRemoveBot(bot.playerId)}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.24)",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(18,17,15,0.86)",
    gap: 10
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.4)",
    backgroundColor: "rgba(50,40,17,0.45)",
    alignItems: "center",
    justifyContent: "center"
  },
  headerCopy: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 18
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 16
  },
  sectionLabel: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 12,
    letterSpacing: 0.6
  },
  intelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  intelChip: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.3)",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "rgba(12,12,14,0.82)"
  },
  intelChipActive: {
    backgroundColor: colors.parchment,
    borderColor: colors.primaryBright
  },
  intelChipText: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  intelChipTextActive: {
    color: colors.parchmentText
  },
  intelHint: {
    color: colors.textDim,
    fontFamily: typography.serifRegular,
    fontSize: 12,
    lineHeight: 17
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  botList: {
    borderTopWidth: 1,
    borderTopColor: "rgba(170,137,132,0.18)",
    paddingTop: 10,
    gap: 8
  },
  botRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(12,12,14,0.7)"
  },
  botRowText: {
    flex: 1,
    gap: 2
  },
  botName: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 15
  },
  botMeta: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 0.6
  }
});
