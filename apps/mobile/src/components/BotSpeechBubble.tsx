import type { BotSpeechEvent } from "@vampir-koylu/shared";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { CinematicMinorRibbon, type CinematicOverlayTone } from "./CinematicInfoOverlay";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightedBotSpeechMessage({
  message,
  targetName,
  style,
  highlightStyle,
  numberOfLines
}: {
  message: string;
  targetName?: string;
  style: object;
  highlightStyle: object;
  numberOfLines?: number;
}) {
  const parts = useMemo(() => {
    const safeTarget = targetName?.trim();
    if (!safeTarget) return [{ text: message, hit: false }];
    const re = new RegExp(`(${escapeRegExp(safeTarget)})`, "giu");
    return message.split(re).filter(Boolean).map((text) => ({
      text,
      hit: text.toLocaleLowerCase("tr-TR") === safeTarget.toLocaleLowerCase("tr-TR")
    }));
  }, [message, targetName]);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => (
        <Text key={`${part.text}-${index}`} style={part.hit ? highlightStyle : undefined}>
          {part.text}
        </Text>
      ))}
    </Text>
  );
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
        <View style={styles.bottomCopy}>
          <Text style={styles.bottomLabel} numberOfLines={1}>Söylenti</Text>
          <HighlightedBotSpeechMessage
            message={event.message}
            targetName={event.targetName}
            style={styles.bottomMessage}
            highlightStyle={styles.messageTarget}
            numberOfLines={1}
          />
        </View>
        <View style={styles.bottomAction}>
          {unreadCount > 0 ? (
            <View style={styles.unreadChip}>
              <Text style={styles.unreadText} numberOfLines={1}>
                {unreadCount}
              </Text>
            </View>
          ) : null}
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
    minHeight: 46,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.34)",
    borderRadius: 14,
    backgroundColor: "rgba(14,8,10,0.96)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14
  },
  bottomCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    overflow: "hidden"
  },
  bottomLabel: {
    flexShrink: 0,
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 11,
    lineHeight: 14
  },
  bottomMessage: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 16
  },
  messageTarget: {
    color: colors.secondary,
    fontFamily: typography.sansBold
  },
  bottomAction: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5
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
