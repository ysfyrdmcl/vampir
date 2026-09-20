import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

interface DeadSealOverlayProps {
  visible: boolean;
  label?: string;
}

export function DeadSealOverlay({ visible, label = "ELENDİ" }: DeadSealOverlayProps) {
  if (!visible) return null;
  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={styles.badge}>
        <Ionicons name="skull-outline" size={13} color={colors.danger} />
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center"
  },
  badge: {
    transform: [{ rotate: "-12deg" }],
    borderWidth: 1,
    borderColor: "rgba(255,143,130,0.65)",
    backgroundColor: "rgba(53,16,16,0.82)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  text: {
    color: colors.danger,
    fontFamily: typography.sansBold,
    fontSize: 11,
    letterSpacing: 0.9
  }
});
