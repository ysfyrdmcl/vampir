import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { LiquidGlassSurface } from "../glass";
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
    <LiquidGlassSurface
      animatedSheen
      depth="floating"
      glow={infoActive}
      intensity={compact ? "medium" : "strong"}
      radius={18}
      style={styles.surface}
      contentStyle={[styles.wrap, compact ? styles.wrapCompact : null]}
      tone={infoActive ? "gold" : "obsidian"}
      variant="panel"
    >
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text style={[styles.title, compact ? styles.titleCompact : null]} numberOfLines={compact ? 2 : 1}>{title}</Text>
          <Text style={[styles.description, compact ? styles.descriptionCompact : null]} numberOfLines={compact ? 2 : 2}>{description}</Text>
          {notice ? <Text style={styles.notice} numberOfLines={compact ? 1 : 2}>{notice}</Text> : null}
        </View>
        {showCountdown ? <PhaseCountdown phaseEndsAt={phaseEndsAt} mode="compact" presentation="phaseSummary" /> : null}
      </View>
      {infoText ? (
        <View style={styles.infoStrip}>
          <View style={[styles.infoIcon, infoActive ? styles.infoIconActive : null]}>
            <Ionicons name={infoIcon} size={15} color={colors.secondary} />
          </View>
          <View style={styles.infoCopy}>
            {infoLabel ? <Text style={styles.infoLabel}>{infoLabel}</Text> : null}
            <Text style={styles.infoText} numberOfLines={2}>{infoText}</Text>
            {infoDetail ? <Text style={styles.infoDetail} numberOfLines={2}>{infoDetail}</Text> : null}
          </View>
          {infoActive ? <Text style={styles.infoBadge}>AKTİF</Text> : null}
        </View>
      ) : null}
    </LiquidGlassSurface>
  );
}

const styles = StyleSheet.create({
  surface: {
    width: "100%"
  },
  wrap: {
    flex: 0,
    paddingHorizontal: spacing.md,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 13
  },
  wrapCompact: {
    paddingHorizontal: 13,
    paddingTop: 15,
    paddingBottom: 14,
    gap: 12
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 7
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 22,
    lineHeight: 27
  },
  titleCompact: {
    fontSize: 20,
    lineHeight: 25
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    lineHeight: 18
  },
  descriptionCompact: {
    fontSize: 12.5,
    lineHeight: 18
  },
  notice: {
    color: colors.secondary,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    lineHeight: 15
  },
  infoStrip: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.30)",
    borderRadius: 14,
    backgroundColor: "rgba(8,8,12,0.48)",
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.42)",
    backgroundColor: "rgba(38,28,18,0.46)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1
  },
  infoIconActive: {
    shadowColor: colors.secondary,
    shadowOpacity: 0.26,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 }
  },
  infoCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4
  },
  infoLabel: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  infoText: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    lineHeight: 18
  },
  infoDetail: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11.5,
    lineHeight: 16
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
