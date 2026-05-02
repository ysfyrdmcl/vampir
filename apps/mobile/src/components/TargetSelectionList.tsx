import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export interface TargetSelectionItem {
  id: string;
  label: string;
  initials: string;
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
  return (
    <View style={styles.grid}>
      {items.map((item) => (
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
          <Text style={[styles.statusText, item.isSelectable ? styles.statusSelectable : styles.statusDisabled]}>
            {item.isSelectable ? (item.isSelected ? "● HEDEF SEÇİLDİ" : "● SEÇİLEBİLİR") : `● ${item.disabledReason ?? "Seçilemez"}`}
          </Text>
          <View style={styles.selectRow}>
            {item.isSelectable ? (
              <Ionicons name={item.isSelected ? "checkmark-circle-outline" : "ellipse-outline"} size={16} color={item.isSelected ? colors.secondary : colors.textDim} />
            ) : (
              <Ionicons name="close-circle-outline" size={16} color={colors.textDim} />
            )}
            <Text style={styles.selectText}>{item.statusText}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10
  },
  card: {
    width: "48.4%",
    minHeight: 188,
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
  statusText: {
    textAlign: "center",
    fontFamily: typography.sansMedium,
    fontSize: 11
  },
  statusSelectable: {
    color: colors.primaryBright
  },
  statusDisabled: {
    color: colors.textDim
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
  }
});
