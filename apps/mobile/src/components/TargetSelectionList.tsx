import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
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
}

interface TargetSelectionListProps {
  items: TargetSelectionItem[];
  onSelect: (id: string) => void;
  disabledSummary?: string | null;
}

export function TargetSelectionList({ items, onSelect, disabledSummary }: TargetSelectionListProps) {
  const [graveyardOpen, setGraveyardOpen] = useState(false);
  const aliveItems = items.filter((item) => item.isAlive);
  const deadItems = items.filter((item) => !item.isAlive);
  const selectableCount = aliveItems.filter((item) => item.isSelectable).length;

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
          <Pressable style={styles.graveyardHeader} onPress={() => setGraveyardOpen((value) => !value)}>
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

interface TargetCardProps {
  item: TargetSelectionItem;
  onSelect: (id: string) => void;
}

function TargetCard({ item, onSelect }: TargetCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasSelected = useRef(item.isSelected);

  useEffect(() => {
    if (item.isSelected && !wasSelected.current) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.06, speed: 30, bounciness: 12, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, speed: 18, bounciness: 8, useNativeDriver: true })
      ]).start();
    }
    wasSelected.current = item.isSelected;
  }, [item.isSelected, scale]);

  const onPressIn = () => {
    if (!item.isSelectable) return;
    Animated.spring(scale, { toValue: 0.96, speed: 40, bounciness: 4, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    if (!item.isSelectable) return;
    Animated.spring(scale, { toValue: 1, speed: 22, bounciness: 8, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      disabled={!item.isSelectable}
      onPress={() => onSelect(item.id)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.cardWrap}
    >
      <Animated.View
        style={[
          styles.card,
          item.isSelectable ? styles.cardSelectable : styles.cardDisabled,
          item.isSelected ? styles.cardSelected : null,
          { transform: [{ scale }] }
        ]}
      >
        <View style={[styles.avatar, item.isSelectable ? styles.avatarSelectable : null, item.isSelected ? styles.avatarSelected : null]}>
          <Text style={styles.avatarText}>{item.initials}</Text>
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
          <Text style={styles.selectText} numberOfLines={1} ellipsizeMode="tail">
            {item.isSelectable ? (item.isSelected ? "Seçildi" : "Seçilebilir") : item.disabledReason ?? "Kilitli"}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    backgroundColor: colors.surfaceGlass,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 5
  },
  cardSelectable: {
    borderColor: "rgba(233,195,73,0.34)",
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  cardDisabled: {
    opacity: 0.48,
    backgroundColor: "rgba(18,19,21,0.54)"
  },
  cardSelected: {
    backgroundColor: colors.parchment,
    borderColor: colors.primaryBright,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 4 }
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
    backgroundColor: "rgba(50,40,17,0.72)"
  },
  avatarText: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 16
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
    color: colors.parchmentText
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
