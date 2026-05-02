import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
}

export function TargetSelectionList({ items, onSelect }: TargetSelectionListProps) {
  const [graveyardOpen, setGraveyardOpen] = useState(false);
  const aliveItems = items.filter((item) => item.isAlive);
  const deadItems = items.filter((item) => !item.isAlive);

  return (
    <View style={styles.section}>
      <View style={styles.grid}>
        {aliveItems.map((item) => (
        <Pressable
          key={item.id}
          style={[styles.card, item.isSelected ? styles.cardSelected : null]}
          disabled={!item.isSelectable}
          onPress={() => onSelect(item.id)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.initials}</Text>
          </View>
          <Text style={[styles.name, item.isSelected ? styles.nameSelected : null]}>{item.label}</Text>
          {item.badgeText ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badgeText}</Text>
            </View>
          ) : null}
          <View style={styles.selectRow}>
            {item.isSelectable ? (
              <Ionicons name={item.isSelected ? "checkmark-circle-outline" : "ellipse-outline"} size={16} color={item.isSelected ? colors.secondary : colors.textDim} />
            ) : (
              <Ionicons name="close-circle-outline" size={16} color={colors.textDim} />
            )}
            <Text style={styles.selectText}>{item.isSelectable ? (item.isSelected ? "Hedef seçildi" : "Seçilebilir") : item.disabledReason ?? "Seçilemez"}</Text>
          </View>
        </Pressable>
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

const styles = StyleSheet.create({
  section: {
    gap: 10
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10
  },
  card: {
    width: "48.4%",
    minHeight: 168,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    backgroundColor: colors.surfaceGlass,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 7
  },
  cardSelected: {
    backgroundColor: colors.parchment,
    borderColor: colors.primaryBright,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.42)",
    backgroundColor: "rgba(8,8,10,0.9)",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarText: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 21
  },
  name: {
    color: "#dec1bd",
    fontFamily: typography.serifSemi,
    fontSize: 34 / 1.75,
    textAlign: "center"
  },
  nameSelected: {
    color: colors.parchmentText
  },
  badge: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.38)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "rgba(48,43,22,0.64)"
  },
  badgeText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 10
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  selectText: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11
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
