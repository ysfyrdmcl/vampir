import { StyleSheet, Text, View } from "react-native";
import { PhaseCountdown } from "./PhaseCountdown";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface PhaseBannerProps {
  title: string;
  description: string;
  phaseEndsAt?: number | null;
  notice?: string;
}

export function PhaseBanner({ title, description, phaseEndsAt = null, notice }: PhaseBannerProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <PhaseCountdown phaseEndsAt={phaseEndsAt} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.25)",
    borderRadius: 14,
    backgroundColor: "rgba(12,12,14,0.84)",
    padding: spacing.lg,
    gap: 8
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 58 / 1.55,
    textAlign: "center"
  },
  description: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.serifRegular,
    fontSize: 18,
    lineHeight: 27
  },
  notice: {
    color: colors.secondary,
    textAlign: "center",
    fontFamily: typography.sansMedium,
    fontSize: 13
  }
});
