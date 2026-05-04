import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface RoomCodeCardProps {
  roomCode: string;
  onCopy: () => void;
  onShare: () => void;
  onShowQr: () => void;
}

export function RoomCodeCard({ roomCode, onCopy, onShare, onShowQr }: RoomCodeCardProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>ODA KODU</Text>
      <Text style={styles.code}>{roomCode}</Text>
      <Text style={styles.hint}>Oyuncular bu kodla katılır</Text>
      <View style={styles.actions}>
        <Pressable style={styles.miniBtn} onPress={onCopy}>
          <Ionicons name="copy-outline" size={14} color={colors.secondary} />
          <Text style={styles.miniText}>Kopyala</Text>
        </Pressable>
        <Pressable style={styles.miniBtn} onPress={onShare}>
          <Ionicons name="share-social-outline" size={14} color={colors.secondary} />
          <Text style={styles.miniText}>Paylaş</Text>
        </Pressable>
        <Pressable style={styles.miniBtn} onPress={onShowQr}>
          <Ionicons name="qr-code-outline" size={14} color={colors.secondary} />
          <Text style={styles.miniText}>QR</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.3)",
    backgroundColor: "rgba(25,25,25,0.82)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: 3
  },
  label: {
    color: colors.textMuted,
    fontFamily: typography.sansBold,
    letterSpacing: 2,
    fontSize: 10
  },
  code: {
    color: colors.secondary,
    fontFamily: typography.serif,
    fontSize: 32,
    letterSpacing: 2.5,
    lineHeight: 36
  },
  hint: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 10,
    lineHeight: 13
  },
  actions: {
    marginTop: 3,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8
  },
  miniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.25)",
    borderRadius: 999,
    minHeight: 30,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "rgba(20,20,20,0.8)"
  },
  miniText: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 11
  }
});
