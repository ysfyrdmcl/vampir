import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentType } from "react";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { SvgProps } from "react-native-svg";
import { GothicDividerSvg, MoonCrestSvg, VampirLogoMarkSvg, VillageSilhouetteSvg, roleSvgIconMap } from "../assets/svg";
import { AnimatedBats, AnimatedCandleFlame, AnimatedMist, FloatingSparks } from "../animations/svg";
import { colors } from "../theme/colors";
import { getResponsiveMetrics, scaledSize } from "../theme/layout";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { ScreenShell } from "./ScreenShell";

const ROLE_SIGILS: { key: string; Icon: ComponentType<SvgProps>; x: number; y: number }[] = [
  { key: "vampire", Icon: roleSvgIconMap.Vampire, x: 0.5, y: 0.02 },
  { key: "detective", Icon: roleSvgIconMap.Detective, x: 0.83, y: 0.2 },
  { key: "guard", Icon: roleSvgIconMap.Guard, x: 0.83, y: 0.62 },
  { key: "doctor", Icon: roleSvgIconMap.Doctor, x: 0.5, y: 0.8 },
  { key: "hunter", Icon: roleSvgIconMap.Hunter, x: 0.17, y: 0.62 },
  { key: "villager", Icon: roleSvgIconMap.Villager, x: 0.17, y: 0.2 }
];

export function BootSplash() {
  const { width, height } = useWindowDimensions();
  const layout = useMemo(() => getResponsiveMetrics(width, height), [height, width]);
  const compact = layout.isCompactHeight;
  const stageSize = scaledSize(compact ? 252 : 292, layout.controlScale, 238, 312);
  const logoSize = scaledSize(compact ? 106 : 126, layout.controlScale, 98, 134);
  const sigilSize = scaledSize(compact ? 45 : 52, layout.controlScale, 40, 56);
  const crestSize = scaledSize(compact ? 218 : 252, layout.controlScale, 204, 272);
  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const ritual = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(ritual, {
        toValue: 1,
        duration: 980,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();

    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1250,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1250,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );
    breathing.start();
    return () => breathing.stop();
  }, [entrance, pulse, ritual]);

  const stageEntranceStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0]
        })
      },
      {
        scale: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1]
        })
      }
    ]
  };

  const crestPulseStyle = {
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.72, 0.96]
    }),
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1.04]
        })
      }
    ]
  };

  const ritualGlowStyle = {
    opacity: ritual.interpolate({
      inputRange: [0, 0.45, 1],
      outputRange: [0.22, 0.64, 1]
    }),
    transform: [
      {
        scaleX: ritual.interpolate({
          inputRange: [0, 1],
          outputRange: [0.18, 1]
        })
      }
    ]
  };

  return (
    <ScreenShell scene="splash" backgroundMode="game" showTopBar={false} showBottomNav={false}>
      <View style={styles.root}>
        <AnimatedBats count={3} height={150} durationMs={4700} style={styles.bats} />
        <AnimatedMist height={180} opacity={0.18} style={styles.mist} />

        <Animated.View style={[styles.stage, { width: stageSize, height: stageSize }, stageEntranceStyle]}>
          <View style={[styles.stageAura, { borderRadius: stageSize / 2 }]} />
          <VillageSilhouetteSvg width="112%" height={82} preserveAspectRatio="xMidYMax meet" style={styles.village} />
          <FloatingSparks
            count={7}
            radius={stageSize * 0.92}
            opacity={0.58}
            style={[styles.sparks, { left: stageSize * 0.04, top: stageSize * 0.04 }]}
          />
          <Animated.View
            style={[
              styles.crest,
              { left: (stageSize - crestSize) / 2, top: (stageSize - crestSize) / 2, width: crestSize, height: crestSize },
              crestPulseStyle
            ]}
          >
            <MoonCrestSvg width={crestSize} height={crestSize} />
          </Animated.View>
          <View
            style={[
              styles.sigilRing,
              {
                left: stageSize * 0.07,
                top: stageSize * 0.07,
                width: stageSize * 0.86,
                height: stageSize * 0.86,
                borderRadius: stageSize * 0.43
              }
            ]}
          />
          {ROLE_SIGILS.map(({ key, Icon, x, y }, index) => {
            const delayStart = 0.08 + index * 0.08;
            const delayEnd = Math.min(delayStart + 0.24, 1);
            const sigilStyle = {
              left: stageSize * x - sigilSize / 2,
              top: stageSize * y - sigilSize / 2,
              width: sigilSize,
              height: sigilSize,
              opacity: ritual.interpolate({
                inputRange: [0, delayStart, delayEnd, 1],
                outputRange: [0, 0, 0.9, 0.9]
              }),
              transform: [
                {
                  scale: ritual.interpolate({
                    inputRange: [0, delayStart, delayEnd, 1],
                    outputRange: [0.78, 0.78, 1, 1]
                  })
                }
              ]
            };

            return (
              <Animated.View key={key} style={[styles.sigil, sigilStyle]}>
                <Icon width="100%" height="100%" />
              </Animated.View>
            );
          })}
          <LinearGradient
            colors={["rgba(255,232,178,0.18)", "rgba(139,0,0,0.2)", "rgba(8,8,12,0.72)"]}
            style={[
              styles.logoHalo,
              {
                left: (stageSize - logoSize - 50) / 2,
                top: (stageSize - logoSize - 50) / 2,
                width: logoSize + 50,
                height: logoSize + 50,
                borderRadius: (logoSize + 50) / 2
              }
            ]}
          />
          <View style={[styles.logoFrame, { width: logoSize + 18, height: logoSize + 18, borderRadius: (logoSize + 18) / 2 }]}>
            <VampirLogoMarkSvg width={logoSize} height={logoSize} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.copy, stageEntranceStyle]}>
          <Text style={styles.kicker}>Gece meclisi açılıyor</Text>
          <Text style={styles.title}>Vampir Köylü</Text>
          <GothicDividerSvg width={154} height={18} style={styles.divider} />
          <Text style={styles.greeting}>Masaya hoş geldin.</Text>
          <Text style={styles.subtitle}>Rolünü sakla. Bakışları oku. İlk gece yaklaşıyor.</Text>
        </Animated.View>

        <View style={styles.ritual}>
          <View style={styles.ritualLine}>
            <Animated.View style={[styles.ritualGlow, ritualGlowStyle]} />
          </View>
          <View style={styles.candles}>
            {[0, 1, 2].map((item) => (
              <View key={item} style={styles.candleSocket}>
                <AnimatedCandleFlame size={20} delayMs={item * 140} />
              </View>
            ))}
          </View>
          <View style={styles.ritualTextRow}>
            <Ionicons name="moon-outline" size={15} color={colors.secondary} />
            <Text style={styles.caption}>Masa hazırlanıyor</Text>
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md
  },
  bats: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "8%"
  },
  mist: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0
  },
  stage: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    overflow: "visible"
  },
  stageAura: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,12,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,232,178,0.12)",
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.26,
    shadowRadius: 38,
    shadowOffset: { width: 0, height: 0 }
  },
  village: {
    position: "absolute",
    left: "-6%",
    bottom: 18,
    opacity: 0.18
  },
  sparks: {
    position: "absolute"
  },
  crest: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center"
  },
  sigilRing: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,232,178,0.15)",
    backgroundColor: "rgba(8,8,12,0.16)"
  },
  sigil: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(8,8,12,0.68)",
    borderWidth: 1,
    borderColor: "rgba(255,232,178,0.16)"
  },
  logoHalo: {
    position: "absolute"
  },
  logoFrame: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,5,8,0.66)",
    borderWidth: 1,
    borderColor: "rgba(255,232,178,0.24)"
  },
  copy: {
    alignItems: "center",
    maxWidth: 360
  },
  kicker: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 13,
    textAlign: "center"
  },
  title: {
    color: colors.secondary,
    fontFamily: typography.serif,
    fontSize: 48,
    textAlign: "center",
    lineHeight: 54
  },
  divider: {
    marginTop: -2,
    marginBottom: 4,
    opacity: 0.78
  },
  greeting: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 24,
    textAlign: "center",
    lineHeight: 30
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sans,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center"
  },
  ritual: {
    width: 236,
    alignItems: "center",
    gap: 8,
    marginTop: spacing.xs
  },
  ritualLine: {
    width: "100%",
    height: 1,
    overflow: "hidden",
    backgroundColor: "rgba(255,232,178,0.12)"
  },
  ritualGlow: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.secondary
  },
  candles: {
    position: "absolute",
    top: -11,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  candleSocket: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,8,12,0.68)",
    borderWidth: 1,
    borderColor: "rgba(255,232,178,0.15)"
  },
  ritualTextRow: {
    marginTop: 10,
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  caption: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    textAlign: "center"
  }
});
