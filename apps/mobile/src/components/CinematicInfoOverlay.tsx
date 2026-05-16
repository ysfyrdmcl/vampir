import { memo, type ReactNode, useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { GothicDividerSvg, ParchmentCornerSvg } from "../assets/svg";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export type CinematicOverlayTone = "night" | "day" | "blood" | "gold" | "neutral";

export interface CinematicInfoPayload {
  title: string;
  subtitle?: string;
  body?: string;
  playerName?: string;
  roleName?: string;
  chips?: string[];
  visualTone?: CinematicOverlayTone;
}

interface MajorProps {
  payload: CinematicInfoPayload;
  visual: ReactNode;
}

interface RibbonProps {
  title: string;
  body: string;
  subtitle?: string;
  chips?: string[];
  tone?: CinematicOverlayTone;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

function toneStyle(tone: CinematicOverlayTone | undefined) {
  switch (tone) {
    case "blood":
      return styles.toneBlood;
    case "day":
    case "gold":
      return styles.toneGold;
    case "night":
      return styles.toneNight;
    default:
      return styles.toneNeutral;
  }
}

function CinematicMajorOverlayBase({ payload, visual }: MajorProps) {
  const visualEntry = useRef(new Animated.Value(0)).current;
  const plaqueEntry = useRef(new Animated.Value(0)).current;
  const tone = payload.visualTone ?? "neutral";
  const chips = [
    payload.playerName,
    payload.roleName,
    ...(payload.chips ?? [])
  ].filter(Boolean) as string[];

  useEffect(() => {
    visualEntry.setValue(0);
    plaqueEntry.setValue(0);
    Animated.parallel([
      Animated.timing(visualEntry, {
        toValue: 1,
        duration: 760,
        useNativeDriver: true
      }),
      Animated.sequence([
        Animated.delay(280),
        Animated.timing(plaqueEntry, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true
        })
      ])
    ]).start();
  }, [payload.title, plaqueEntry, visualEntry]);

  const visualEntryStyle = {
    opacity: visualEntry,
    transform: [
      { scale: visualEntry.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }
    ]
  };
  const plaqueEntryStyle = {
    opacity: plaqueEntry,
    transform: [
      { translateY: plaqueEntry.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
      { scale: plaqueEntry.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }
    ]
  };

  return (
    <View style={styles.majorRoot}>
      <View style={[styles.aura, toneStyle(tone)]} />
      <Animated.View style={[styles.visualLayer, visualEntryStyle]}>{visual}</Animated.View>
      <Animated.View style={[styles.plaqueWrap, plaqueEntryStyle]}>
        <ParchmentCornerSvg width={34} height={34} style={[styles.corner, styles.cornerTopLeft]} opacity={0.34} />
        <ParchmentCornerSvg width={34} height={34} style={[styles.corner, styles.cornerBottomRight]} opacity={0.26} />
        <Text style={styles.kicker}>{payload.subtitle ?? "Ritüel Duyurusu"}</Text>
        <Text style={styles.majorTitle}>{payload.title}</Text>
        <GothicDividerSvg width={170} height={18} opacity={0.56} />
        {payload.body ? <Text style={styles.majorBody}>{payload.body}</Text> : null}
        {chips.length ? (
          <View style={styles.chipRow}>
            {chips.slice(0, 4).map((chip) => (
              <Text key={chip} style={styles.chip} numberOfLines={1}>
                {chip}
              </Text>
            ))}
          </View>
        ) : null}
        <Text style={styles.dismissHint}>Dokun kapat</Text>
      </Animated.View>
    </View>
  );
}

function CinematicMinorRibbonBase({ title, body, subtitle, chips, tone = "neutral", style, compact = false }: RibbonProps) {
  return (
    <View style={[styles.ribbon, compact ? styles.ribbonCompact : null, toneStyle(tone), style]}>
      <ParchmentCornerSvg
        width={compact ? 18 : 22}
        height={compact ? 18 : 22}
        style={[styles.ribbonCorner, styles.ribbonCornerLeft]}
        opacity={compact ? 0.16 : 0.18}
      />
      <View style={[styles.ribbonCopy, compact ? styles.ribbonCopyCompact : null]}>
        {subtitle ? <Text style={styles.ribbonKicker}>{subtitle}</Text> : null}
        <Text style={styles.ribbonTitle} numberOfLines={1}>{title}</Text>
        <Text style={[styles.ribbonBody, compact ? styles.ribbonBodyCompact : null]} numberOfLines={compact ? 2 : undefined}>
          {body}
        </Text>
        {chips?.length ? (
          <View style={styles.ribbonChips}>
            {chips.slice(0, 3).map((chip) => (
              <Text key={chip} style={styles.ribbonChip} numberOfLines={1}>{chip}</Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export const CinematicMajorOverlay = memo(CinematicMajorOverlayBase);
export const CinematicMinorRibbon = memo(CinematicMinorRibbonBase);

const styles = StyleSheet.create({
  majorRoot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    overflow: "visible"
  },
  aura: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.78
  },
  toneNight: {
    borderColor: "rgba(128,159,210,0.24)",
    backgroundColor: "rgba(22,32,58,0.28)",
    shadowColor: "#6d83b8"
  },
  toneGold: {
    borderColor: "rgba(233,195,73,0.32)",
    backgroundColor: "rgba(72,52,18,0.24)",
    shadowColor: colors.secondary
  },
  toneBlood: {
    borderColor: "rgba(196,55,55,0.35)",
    backgroundColor: "rgba(72,14,18,0.28)",
    shadowColor: colors.primary
  },
  toneNeutral: {
    borderColor: "rgba(170,137,132,0.24)",
    backgroundColor: "rgba(18,18,22,0.30)",
    shadowColor: "#000"
  },
  visualLayer: {
    ...StyleSheet.absoluteFillObject
  },
  plaqueWrap: {
    width: "100%",
    maxWidth: 390,
    marginTop: 230,
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(233,195,73,0.30)",
    backgroundColor: "rgba(10,9,12,0.52)",
    paddingHorizontal: 22,
    paddingVertical: 17,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.36,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }
  },
  corner: {
    position: "absolute"
  },
  cornerTopLeft: {
    left: 6,
    top: 5
  },
  cornerBottomRight: {
    right: 6,
    bottom: 5,
    transform: [{ rotate: "180deg" }]
  },
  kicker: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  majorTitle: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 4 }
  },
  majorBody: {
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center"
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginTop: 4
  },
  chip: {
    maxWidth: 150,
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.34)",
    backgroundColor: "rgba(30,24,14,0.56)",
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 0.7,
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase"
  },
  dismissHint: {
    marginTop: 4,
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    opacity: 0.78
  },
  ribbon: {
    width: "100%",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: "hidden",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }
  },
  ribbonCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowOpacity: 0.16,
    shadowRadius: 8
  },
  ribbonCorner: {
    position: "absolute"
  },
  ribbonCornerLeft: {
    left: 7,
    top: 8
  },
  ribbonCopy: {
    gap: 4,
    paddingLeft: 18,
    minWidth: 0
  },
  ribbonCopyCompact: {
    gap: 2,
    paddingLeft: 16
  },
  ribbonKicker: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 9.5,
    letterSpacing: 1.3,
    textTransform: "uppercase"
  },
  ribbonTitle: {
    color: colors.secondary,
    fontFamily: typography.serifSemi,
    fontSize: 16,
    lineHeight: 20
  },
  ribbonBody: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 12.5,
    lineHeight: 18
  },
  ribbonBodyCompact: {
    fontSize: 12,
    lineHeight: 16
  },
  ribbonChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 2
  },
  ribbonChip: {
    maxWidth: 130,
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.26)",
    color: colors.textMuted,
    fontFamily: typography.sansBold,
    fontSize: 9,
    paddingHorizontal: 7,
    paddingVertical: 3,
    textTransform: "uppercase"
  }
});
