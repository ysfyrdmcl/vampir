import type { BotSpeechEvent } from "@vampir-koylu/shared";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { CinematicMinorRibbon, type CinematicOverlayTone } from "./CinematicInfoOverlay";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { botSpeechIntentLabel, formatBotSpeechPhaseContext } from "../utils/bot-speech-labels";

export type BotSpeechDisplayTone =
  | "neutral"
  | "accusing"
  | "defensive"
  | "suspicious"
  | "deceptive"
  | "confident";

export function resolveBotSpeechDisplayTone(event: BotSpeechEvent): BotSpeechDisplayTone {
  const { intent, tone } = event;
  if (intent === "accuse_soft") return "accusing";
  if (intent === "self_defense" || intent === "support_soft") return "defensive";
  if (intent === "vote_hint" || intent === "mayor_hint" || intent === "analysis") return "confident";
  if (intent === "chaos") return "deceptive";
  if (intent === "tie_reaction" || intent === "execution_reaction" || intent === "hunter_reaction") return "suspicious";
  if (intent === "generic_observation" || intent === "small_talk") {
    if (tone === "sharp") return "suspicious";
    if (tone === "playful") return "deceptive";
    return "neutral";
  }
  if (tone === "sharp") return "accusing";
  if (tone === "playful") return "deceptive";
  return "neutral";
}

function ribbonTone(displayTone: BotSpeechDisplayTone): CinematicOverlayTone {
  switch (displayTone) {
    case "accusing":
      return "blood";
    case "defensive":
    case "confident":
      return "gold";
    case "suspicious":
    case "deceptive":
      return "night";
    default:
      return "neutral";
  }
}

function SuspiciousPulse({ children }: PropsWithChildren) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

export interface BotSpeechBubbleProps {
  event: BotSpeechEvent;
  onPress: () => void;
  variant?: "floating" | "bottom-ribbon";
  unreadCount?: number;
  animatedStyle?: {
    opacity: Animated.Value;
    transform: [{ translateY: Animated.Value }];
  };
}

export function BotSpeechBubble({
  event,
  onPress,
  variant = "floating",
  unreadCount = 0,
  animatedStyle
}: BotSpeechBubbleProps) {
  const displayTone = useMemo(() => resolveBotSpeechDisplayTone(event), [event]);
  const tone = ribbonTone(displayTone);
  const inner =
    variant === "bottom-ribbon" ? (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Köy söylentilerini aç"
        style={({ pressed }) => [styles.bottomRibbon, { opacity: pressed ? 0.92 : 1 }]}
      >
        <View style={styles.bottomIcon}>
          <Ionicons name="chatbubbles-outline" size={18} color={colors.secondary} />
        </View>
        <View style={styles.bottomCopy}>
          <Text style={styles.bottomMeta} numberOfLines={1}>
            {event.speakerName} · {botSpeechIntentLabel(event.intent)} · {formatBotSpeechPhaseContext(event.phaseId)}
          </Text>
          <Text style={styles.bottomMessage} numberOfLines={2}>
            {event.message}
          </Text>
        </View>
        <View style={styles.bottomAction}>
          {unreadCount > 0 ? (
            <View style={styles.unreadChip}>
              <Text style={styles.unreadText} numberOfLines={1}>
                {unreadCount}
              </Text>
            </View>
          ) : null}
          <Text style={styles.bottomActionText} numberOfLines={1}>
            Söylentiler
          </Text>
          <Ionicons name="chevron-forward" size={15} color={colors.secondary} />
        </View>
      </Pressable>
    ) : (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Köy söylentisini kapat ve sıradakini göster"
        style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.9 : 1 }]}
      >
        <CinematicMinorRibbon
          title={event.speakerName}
          subtitle="Söylenti"
          body={event.message}
          tone={tone}
          compact
        />
      </Pressable>
    );

  const wrapped =
    displayTone === "suspicious" ? <SuspiciousPulse>{inner}</SuspiciousPulse> : inner;

  if (animatedStyle) {
    return (
      <Animated.View
        style={{
          opacity: animatedStyle.opacity,
          transform: animatedStyle.transform
        }}
      >
        {wrapped}
      </Animated.View>
    );
  }

  return <View>{wrapped}</View>;
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%"
  },
  bottomRibbon: {
    width: "100%",
    minHeight: 74,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.34)",
    borderRadius: 15,
    backgroundColor: "rgba(14,8,10,0.96)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14
  },
  bottomIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.32)",
    backgroundColor: "rgba(45,24,22,0.9)",
    alignItems: "center",
    justifyContent: "center"
  },
  bottomCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  bottomMeta: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.5
  },
  bottomMessage: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 12.5,
    lineHeight: 17
  },
  bottomAction: {
    flexShrink: 0,
    maxWidth: 94,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3
  },
  bottomActionText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 10.5,
    lineHeight: 13
  },
  unreadChip: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: "rgba(233,195,73,0.18)",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.4)",
    alignItems: "center",
    justifyContent: "center"
  },
  unreadText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 10,
    lineHeight: 12
  }
});
