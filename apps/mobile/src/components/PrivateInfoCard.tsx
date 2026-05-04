import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import type { PrivateResultKind } from "../store/game-store";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

const TITLES: Record<PrivateResultKind, string> = {
  detective: "Gece bilgisi",
  lover: "Kişisel bilgi",
  info: "Bilgi"
};

const ICONS: Record<PrivateResultKind, keyof typeof Ionicons.glyphMap> = {
  detective: "search-outline",
  lover: "heart-outline",
  info: "information-circle-outline"
};

interface Props {
  kind: PrivateResultKind;
  body: string;
}

export function PrivateInfoCard({ kind, body }: Props) {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.iconWrap}>
        <Ionicons name={ICONS[kind]} size={15} color="rgba(170,160,150,0.75)" />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{TITLES[kind]}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(120,110,105,0.22)",
    backgroundColor: "rgba(14,14,16,0.72)",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(100,95,90,0.25)",
    backgroundColor: "rgba(8,8,10,0.55)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4
  },
  title: {
    color: "rgba(180,172,165,0.85)",
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  body: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    lineHeight: 19
  }
});
