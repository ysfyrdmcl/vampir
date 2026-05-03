import { StyleSheet, Text } from "react-native";
import { GothicCard } from "./GothicCard";
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
    <GothicCard style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <PhaseCountdown phaseEndsAt={phaseEndsAt} mode="compact" />
    </GothicCard>
  );
}

const styles = StyleSheet.create({
  wrap: {
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
