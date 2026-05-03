import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";

interface HeroBrandAreaProps {
  title: string;
  subtitle: string;
}

export function HeroBrandArea({ title, subtitle }: HeroBrandAreaProps) {
  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.32)).current;

  useEffect(() => {
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(driftX, { toValue: 5, duration: 2800, useNativeDriver: true }),
          Animated.timing(driftY, { toValue: -4, duration: 2800, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.5, duration: 2800, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(driftX, { toValue: -4, duration: 2800, useNativeDriver: true }),
          Animated.timing(driftY, { toValue: 3, duration: 2800, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.3, duration: 2800, useNativeDriver: true })
        ])
      ])
    );
    driftLoop.start();
    return () => driftLoop.stop();
  }, [driftX, driftY, glow]);

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.moonHalo,
          {
            transform: [{ translateX: driftX }, { translateY: driftY }],
            opacity: glow
          }
        ]}
      />
      <View style={styles.badge}>
        <Ionicons name="moon-outline" size={16} color={colors.secondary} />
        <Ionicons name="shield-outline" size={30} color={colors.secondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 7
  },
  moonHalo: {
    position: "absolute",
    top: -6,
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "rgba(181,38,25,0.2)"
  },
  badge: {
    width: uiStandard.screen.heroBadgeSize - 6,
    height: uiStandard.screen.heroBadgeSize - 6,
    borderRadius: (uiStandard.screen.heroBadgeSize - 6) / 2,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.38)",
    backgroundColor: "rgba(14,14,14,0.7)",
    gap: 2
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: uiStandard.text.heroTitleSize - 6,
    textAlign: "center"
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: uiStandard.text.heroSubtitleSize - 2,
    textAlign: "center"
  }
});
