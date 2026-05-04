import type { BotSpeechEvent } from "@vampir-koylu/shared";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
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
  if (intent === "vote_hint") return "confident";
  if (intent === "generic_observation") {
    if (tone === "sharp") return "suspicious";
    if (tone === "playful") return "deceptive";
    return "neutral";
  }
  if (tone === "sharp") return "accusing";
  if (tone === "playful") return "deceptive";
  return "neutral";
}

function toneCardStyle(displayTone: BotSpeechDisplayTone) {
  switch (displayTone) {
    case "accusing":
      return {
        borderColor: "rgba(229,57,53,0.45)",
        backgroundColor: "rgba(28,10,10,0.92)",
        shadowColor: "#c62828"
      };
    case "defensive":
      return {
        borderColor: "rgba(233,195,73,0.42)",
        backgroundColor: "rgba(24,20,10,0.92)",
        shadowColor: colors.secondary
      };
    case "suspicious":
      return {
        borderColor: "rgba(170,137,132,0.5)",
        backgroundColor: "rgba(16,14,18,0.94)",
        shadowColor: "#6d5a7a"
      };
    case "deceptive":
      return {
        borderColor: "rgba(142,36,170,0.38)",
        backgroundColor: "rgba(18,10,22,0.93)",
        shadowColor: "#8e24aa"
      };
    case "confident":
      return {
        borderColor: "rgba(233,195,73,0.5)",
        backgroundColor: "rgba(22,18,8,0.93)",
        shadowColor: colors.secondaryDim
      };
    default:
      return {
        borderColor: "rgba(170,137,132,0.28)",
        backgroundColor: "rgba(12,12,14,0.94)",
        shadowColor: "#000"
      };
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
  animatedStyle?: {
    opacity: Animated.Value;
    transform: [{ translateY: Animated.Value }];
  };
}

export function BotSpeechBubble({ event, onPress, animatedStyle }: BotSpeechBubbleProps) {
  const displayTone = useMemo(() => resolveBotSpeechDisplayTone(event), [event]);
  const accent = toneCardStyle(displayTone);
  const inner = (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Köy söylentisini kapat ve sıradakini göster"
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: accent.borderColor,
          backgroundColor: accent.backgroundColor,
          shadowColor: accent.shadowColor,
          shadowOpacity: displayTone === "deceptive" ? 0.35 : displayTone === "confident" ? 0.28 : 0.2,
          shadowRadius: displayTone === "deceptive" ? 14 : 10,
          shadowOffset: { width: 0, height: 0 },
          opacity: pressed ? 0.92 : 1
        }
      ]}
    >
      <Text style={styles.speakerLine} numberOfLines={1}>
        Bot · {event.speakerName}
      </Text>
      <Text style={styles.messageLine}>{event.message}</Text>
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
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    elevation: 6
  },
  speakerLine: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 11,
    letterSpacing: 1.1,
    marginBottom: 6
  },
  messageLine: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 15,
    lineHeight: 21
  }
});
