import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
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
  infoLabel?: string;
  infoText?: string;
  infoDetail?: string;
  infoIcon?: keyof typeof Ionicons.glyphMap;
  infoActive?: boolean;
  compact?: boolean;
  showCountdown?: boolean;
}

export function PhaseBanner({
  title,
  description,
  phaseEndsAt = null,
  notice,
  infoLabel,
  infoText,
  infoDetail,
  infoIcon = "information-circle-outline",
  infoActive = false,
  compact = false,
  showCountdown = true
}: PhaseBannerProps) {
  return (
    <GothicCard style={[styles.wrap, compact ? styles.wrapCompact : null]}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.description} numberOfLines={compact ? 1 : 2}>{description}</Text>
          {notice ? <Text style={styles.notice} numberOfLines={compact ? 1 : 2}>{notice}</Text> : null}
        </View>
        {showCountdown ? <PhaseCountdown phaseEndsAt={phaseEndsAt} mode="compact" presentation="phaseSummary" /> : null}
      </View>
      {infoText ? (
        <View style={styles.infoStrip}>
          <View style={styles.infoIcon}>
            <Ionicons name={infoIcon} size={15} color={colors.secondary} />
          </View>
          <View style={styles.infoCopy}>
            {infoLabel ? <Text style={styles.infoLabel}>{infoLabel}</Text> : null}
            <Text style={styles.infoText} numberOfLines={compact ? 1 : 2}>{infoText}</Text>
            {infoDetail ? <Text style={styles.infoDetail} numberOfLines={1}>{infoDetail}</Text> : null}
          </View>
          {infoActive ? <Text style={styles.infoBadge}>AKTİF</Text> : null}
        </View>
      ) : null}
    </GothicCard>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 10
  },
  wrapCompact: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 7
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 22,
    lineHeight: 25
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 16
  },
  notice: {
    color: colors.secondary,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    lineHeight: 15
  },
  infoStrip: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.22)",
    borderRadius: 12,
    backgroundColor: "rgba(16,16,18,0.54)",
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.28)",
    backgroundColor: "rgba(50,40,17,0.34)",
    alignItems: "center",
    justifyContent: "center"
  },
  infoCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1
  },
  infoLabel: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  infoText: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 16
  },
  infoDetail: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 10,
    lineHeight: 14
  },
  infoBadge: {
    color: colors.backgroundDeep,
    backgroundColor: colors.secondary,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontFamily: typography.sansBold,
    fontSize: 9
  }
});
