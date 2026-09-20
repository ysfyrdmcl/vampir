import { memo, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AnimatedBloodDrop } from "../animations/svg";
import { LiquidGlassPressable } from "../glass";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export interface TargetSelectionItem {
  id: string;
  label: string;
  initials: string;
  isAlive: boolean;
  isSelectable: boolean;
  isSelected: boolean;
  statusText: string;
  disabledReason?: string | null;
  badgeText?: string | null;
  selectionAccent?: "blood";
}

interface TargetSelectionListProps {
  items: TargetSelectionItem[];
  onSelect: (id: string) => void;
  disabledSummary?: string | null;
}

function TargetSelectionListBase({ items, onSelect, disabledSummary }: TargetSelectionListProps) {
  const [graveyardOpen, setGraveyardOpen] = useState(false);
  const aliveItems = useMemo(() => items.filter((item) => item.isAlive), [items]);
  const deadItems = useMemo(() => items.filter((item) => !item.isAlive), [items]);
  const selectableCount = useMemo(
    () => aliveItems.filter((item) => item.isSelectable).length,
    [aliveItems]
  );

  return (
    <View style={styles.section}>
      {disabledSummary && selectableCount === 0 ? (
        <View style={styles.lockedBand}>
          <Ionicons name="lock-closed-outline" size={15} color={colors.textDim} />
          <Text style={styles.lockedBandText}>{disabledSummary}</Text>
        </View>
      ) : null}
      <View style={styles.grid}>
        {aliveItems.map((item) => (
          <TargetCard key={item.id} item={item} onSelect={onSelect} />
        ))}
      </View>
      {deadItems.length ? (
        <View style={styles.graveyard}>
          <Pressable accessibilityRole="button" accessibilityLabel="Elenen oyuncular" accessibilityState={{ expanded: graveyardOpen }} style={styles.graveyardHeader} onPress={() => setGraveyardOpen((value) => !value)}>
            <Text style={styles.graveyardTitle}>{`🪦 Mezarlık (${deadItems.length})`}</Text>
            <Ionicons name={graveyardOpen ? "chevron-up-outline" : "chevron-down-outline"} size={16} color={colors.textDim} />
          </Pressable>
          {graveyardOpen ? (
            <View style={styles.graveyardList}>
              {deadItems.map((item) => (
                <View key={item.id} style={styles.graveyardRow}>
                  <Text style={styles.graveyardName}>{item.label}</Text>
                  <Text style={styles.graveyardBadge}>ELENDİ</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const TargetSelectionList = memo(TargetSelectionListBase);

interface TargetCardProps {
  item: TargetSelectionItem;
  onSelect: (id: string) => void;
}

const TargetCard = memo(function TargetCard({ item, onSelect }: TargetCardProps) {
  return (
    <LiquidGlassPressable
      accessibilityLabel={`${item.label}, ${item.isSelectable ? item.isSelected ? "seçildi" : "seçilebilir" : item.disabledReason ?? "kilitli"}`}
      accessibilityState={{ selected: item.isSelected }}
      disabled={!item.isSelectable}
      onPress={() => onSelect(item.id)}
      style={styles.cardWrap}
      surfaceStyle={styles.card}
      contentStyle={styles.cardContent}
      selected={item.isSelected}
      glow={item.isSelected}
      variant={item.isSelected ? "selected" : item.isSelectable ? "panel" : "low"}
      animatedSheen={item.isSelected}
      depth={item.isSelected ? "floating" : item.isSelectable ? "raised" : "flat"}
      feedback={item.isSelectable ? "strong" : "none"}
      intensity={item.isSelected ? "strong" : item.isSelectable ? "medium" : "subtle"}
      tone={item.isSelected ? "gold" : item.isSelectable ? "obsidian" : "obsidian"}
    >
      {item.selectionAccent === "blood" && item.isSelected ? (
        <View pointerEvents="none" style={styles.bloodAccent}>
          <AnimatedBloodDrop size={16} x={5} y={-4} />
          <AnimatedBloodDrop size={11} x={20} y={3} delayMs={180} />
        </View>
      ) : null}
      {item.isSelected ? (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark" size={11} color={colors.backgroundDeep} />
          <Text style={styles.selectedBadgeText}>SEÇİLDİ</Text>
        </View>
      ) : null}
      <View style={[styles.avatar, item.isSelectable ? styles.avatarSelectable : null, item.isSelected ? styles.avatarSelected : null]}>
        <Text style={[styles.avatarText, item.isSelected ? styles.avatarTextSelected : null]}>{item.initials}</Text>
      </View>
      <Text style={[styles.name, item.isSelected ? styles.nameSelected : null]} numberOfLines={1} ellipsizeMode="tail">
        {item.label}
      </Text>
      {item.badgeText ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badgeText}</Text>
        </View>
      ) : null}
      <View style={styles.selectRow}>
        {item.isSelectable ? (
          <Ionicons name={item.isSelected ? "checkmark-circle-outline" : "ellipse-outline"} size={16} color={item.isSelected ? colors.secondary : colors.textDim} />
        ) : (
          <Ionicons name="lock-closed-outline" size={14} color={colors.textDim} />
        )}
        <Text style={[styles.selectText, item.isSelected ? styles.selectTextSelected : null]} numberOfLines={1} ellipsizeMode="tail">
          {item.isSelectable ? (item.isSelected ? "Seçildi" : "Seçilebilir") : item.disabledReason ?? "Kilitli"}
        </Text>
      </View>
    </LiquidGlassPressable>
  );
}, (previous, next) => previous.onSelect === next.onSelect &&
  previous.item.id === next.item.id && previous.item.label === next.item.label &&
  previous.item.initials === next.item.initials && previous.item.isSelectable === next.item.isSelectable &&
  previous.item.isSelected === next.item.isSelected && previous.item.disabledReason === next.item.disabledReason &&
  previous.item.badgeText === next.item.badgeText && previous.item.selectionAccent === next.item.selectionAccent);

const styles = StyleSheet.create({
  section: {
    gap: 8
  },
  lockedBand: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 12,
    backgroundColor: "rgba(12,12,14,0.58)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  lockedBandText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 17
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 7
  },
  cardWrap: {
    width: "49%"
  },
  card: {
    width: "100%",
    minHeight: 104,
  },
  cardContent: {
    minHeight: 104,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 5,
    position: "relative"
  },
  bloodAccent: {
    position: "absolute",
    right: 4,
    top: 18,
    width: 38,
    height: 58
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.42)",
    backgroundColor: "rgba(8,8,10,0.9)",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarSelectable: {
    borderColor: "rgba(233,195,73,0.58)"
  },
  avatarSelected: {
    backgroundColor: "rgba(90,24,28,0.38)",
    borderColor: "rgba(255,213,92,0.72)",
    shadowColor: colors.secondary,
    shadowOpacity: 0.34,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 }
  },
  avatarText: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 16
  },
  avatarTextSelected: {
    color: colors.secondary
  },
  name: {
    color: "#dec1bd",
    fontFamily: typography.serifSemi,
    fontSize: 15,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: "100%"
  },
  nameSelected: {
    color: colors.secondary
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.38)",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: "rgba(48,43,22,0.64)"
  },
  badgeText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 8
  },
  selectedBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }
  },
  selectedBadgeText: {
    color: colors.backgroundDeep,
    fontFamily: typography.sansBold,
    fontSize: 8,
    letterSpacing: 0.4
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: "100%"
  },
  selectText: {
    flexShrink: 1,
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 10,
    lineHeight: 13
  },
  selectTextSelected: {
    color: colors.secondary,
    fontFamily: typography.sansBold
  },
  graveyard: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.2)",
    borderRadius: 12,
    backgroundColor: "rgba(12,12,14,0.45)"
  },
  graveyardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  graveyardTitle: {
    color: colors.textMuted,
    fontFamily: typography.sansBold,
    fontSize: 12,
    letterSpacing: 0.8
  },
  graveyardList: {
    borderTopWidth: 1,
    borderTopColor: "rgba(170,137,132,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6
  },
  graveyardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    opacity: 0.72
  },
  graveyardName: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  graveyardBadge: {
    color: colors.danger,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 0.8
  }
});
