import type { BotSpeechEvent } from "@vampir-koylu/shared";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { CinematicMinorRibbon, type CinematicOverlayTone } from "./CinematicInfoOverlay";

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
  animatedStyle?: {
    opacity: Animated.Value;
    transform: [{ translateY: Animated.Value }];
  };
}

export function BotSpeechBubble({ event, onPress, animatedStyle }: BotSpeechBubbleProps) {
  const displayTone = useMemo(() => resolveBotSpeechDisplayTone(event), [event]);
  const tone = ribbonTone(displayTone);
  const inner = (
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
        chips={event.intent ? [event.intent.replace(/_/g, " ")] : undefined}
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
  }
});
