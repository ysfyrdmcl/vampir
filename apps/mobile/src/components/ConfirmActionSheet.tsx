import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";
import { PrimaryButton } from "./PrimaryButton";

interface ConfirmActionSheetProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "blood" | "gold";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmActionSheet({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = "İptal",
  variant = "blood",
  onConfirm,
  onCancel
}: ConfirmActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.actions}>
            <PrimaryButton label={confirmLabel} variant={variant} onPress={onConfirm} />
            <PrimaryButton label={cancelLabel} variant="ghost" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: `rgba(0,0,0,${uiStandard.fx.overlayDark})`
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.28)",
    backgroundColor: "rgba(16,16,18,0.98)",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md
  },
  title: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 28 / 1.4,
    textAlign: "center"
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center"
  },
  actions: {
    gap: spacing.sm
  }
});
