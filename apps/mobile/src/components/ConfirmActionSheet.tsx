import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";
import { LiquidGlassSurface } from "../glass";
import { PrimaryButton } from "./PrimaryButton";
import { useMotionEnabled } from "../motion/MotionPreferences";

interface ConfirmActionSheetProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "blood" | "gold" | "charcoal";
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
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const motionEnabled = useMotionEnabled();
  return (
    <Modal visible={visible} transparent animationType={motionEnabled ? "fade" : "none"} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable accessible={false} style={styles.backdrop} onPress={onCancel} />
        <LiquidGlassSurface variant="panel" radius={20} glow style={[styles.sheet, { maxHeight: height - insets.top - spacing.md }]} contentStyle={styles.sheetScroll}>
          <ScrollView bounces={false} contentContainerStyle={[styles.sheetContent, { paddingBottom: spacing.lg + insets.bottom }]} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.actions}>
            <PrimaryButton label={confirmLabel} variant={variant} onPress={onConfirm} />
            <PrimaryButton label={cancelLabel} variant="ghost" compact onPress={onCancel} />
          </View>
          </ScrollView>
        </LiquidGlassSurface>
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
    ...StyleSheet.absoluteFill
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0
  },
  sheetContent: {
    flex: 0,
    borderWidth: 1,
    borderColor: "rgba(255,232,178,0.12)",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md
  },
  sheetScroll: {
    flex: 0,
    flexShrink: 1
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
