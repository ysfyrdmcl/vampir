import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import type { Role } from "@vampir-koylu/shared";
import { LinearGradient } from "expo-linear-gradient";
import Reanimated, {
  Easing as ReanimatedEasing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { RoleAuraAnimation } from "../animations";
import {
  ROLE_REVEAL_ART,
  ROLE_REVEAL_FRAME
} from "../data/role-reveal-art";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { getRoleTheme } from "../ui/role-theme";
import { toRoleLabel } from "../utils/role-label";

interface RoleRevealCardProps {
  role: Role | null;
  loverPartnerName?: string | null;
  maxColumnWidth?: number;
  maxCardHeight?: number;
}

const FLIP_DURATION_MS = 760;
const FLIP_CLOSE_DURATION_MS = 680;
const FLIP_EASING = ReanimatedEasing.bezier(0.16, 1, 0.3, 1);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function getTeamLabel(role: Role | null): string {
  if (role === "Vampire") return "Vampir";
  if (
    role === "Villager" ||
    role === "Detective" ||
    role === "Doctor" ||
    role === "Guard" ||
    role === "Hunter"
  )
    return "Köy";
  return "Oyuncu";
}

export function RoleRevealCard({
  role,
  loverPartnerName,
  maxColumnWidth = 400,
  maxCardHeight
}: RoleRevealCardProps) {
  const [revealed, setRevealed] = useState(false);
  const closeContentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width, height } = useWindowDimensions();

  const roleTheme = useMemo(() => getRoleTheme(role), [role]);
  const roleArt = role ? ROLE_REVEAL_ART[role] : null;
  const cardWidth = Math.min(356, maxColumnWidth, width - spacing.md * 2);
  const compact = height < 720;
  const computedCardHeight = Math.round(cardWidth * (compact ? 1.47 : 1.66));
  const cardHeight = maxCardHeight
    ? Math.min(computedCardHeight, maxCardHeight)
    : computedCardHeight;
  const artHeight = Math.round(
    clamp(cardHeight * (compact ? 0.52 : 0.58), compact ? 210 : 300, compact ? 270 : 350)
  );
  const titleSize = compact ? 27 : 31;
  const missionSize = compact ? 11.5 : 12.5;

  const entry = useMemo(() => new Animated.Value(0), []);
  const revealProgress = useMemo(() => new Animated.Value(0), []);
  const revealBloom = useMemo(() => new Animated.Value(0), []);
  const rotateX = useMemo(() => new Animated.Value(0), []);
  const rotateY = useMemo(() => new Animated.Value(0), []);
  const pressDepth = useMemo(() => new Animated.Value(0), []);
  const content = useMemo(() => new Animated.Value(0), []);
  const particles = useMemo(() => new Animated.Value(0), []);
  const idle = useMemo(() => new Animated.Value(0), []);
  const flipProgress = useSharedValue(0);

  useEffect(() => {
    setRevealed(false);
    if (closeContentTimerRef.current) {
      clearTimeout(closeContentTimerRef.current);
      closeContentTimerRef.current = null;
    }
    entry.setValue(0);
    revealProgress.setValue(0);
    revealBloom.setValue(0);
    rotateX.setValue(0);
    rotateY.setValue(0);
    pressDepth.setValue(0);
    content.setValue(0);
    particles.setValue(0);
    idle.setValue(0);
    flipProgress.value = 0;

    Animated.parallel([
      Animated.timing(entry, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.sequence([
        Animated.delay(180),
        Animated.timing(particles, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      ])
    ]).start();
  }, [content, entry, flipProgress, idle, particles, pressDepth, revealBloom, revealProgress, role, rotateX, rotateY]);

  useEffect(() => () => {
    if (closeContentTimerRef.current) clearTimeout(closeContentTimerRef.current);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idle, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(idle, { toValue: -1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(idle, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [idle]);

  const reveal = useCallback(() => {
    if (revealed) return;
    if (closeContentTimerRef.current) {
      clearTimeout(closeContentTimerRef.current);
      closeContentTimerRef.current = null;
    }
    setRevealed(true);
    flipProgress.value = withTiming(1, { duration: FLIP_DURATION_MS, easing: FLIP_EASING });
    Animated.parallel([
      Animated.sequence([
        Animated.timing(revealProgress, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.spring(revealProgress, {
          toValue: 1,
          damping: 18,
          stiffness: 120,
          mass: 0.8,
          useNativeDriver: true
        })
      ]),
      Animated.sequence([
        Animated.timing(revealBloom, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(revealBloom, {
          toValue: 0.55,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        })
      ]),
      Animated.sequence([
        Animated.delay(420),
        Animated.timing(content, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      ])
    ]).start();
  }, [content, flipProgress, revealBloom, revealProgress, revealed]);

  const conceal = useCallback(() => {
    if (!revealed) return;
    setRevealed(false);
    flipProgress.value = withTiming(0, { duration: FLIP_CLOSE_DURATION_MS, easing: FLIP_EASING });
    if (closeContentTimerRef.current) clearTimeout(closeContentTimerRef.current);
    closeContentTimerRef.current = setTimeout(() => {
      content.setValue(0);
      closeContentTimerRef.current = null;
    }, FLIP_CLOSE_DURATION_MS - 120);
    Animated.parallel([
      Animated.timing(revealProgress, {
        toValue: 0,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(revealBloom, {
        toValue: 0,
        duration: 560,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true
      })
    ]).start();
  }, [content, flipProgress, revealBloom, revealProgress, revealed]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: (event) => {
          Animated.timing(pressDepth, {
            toValue: 1,
            duration: 140,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true
          }).start();
        },
        onPanResponderMove: (_event, gestureState) => {
          if (revealed) {
            rotateY.setValue(clamp((gestureState.dx / (cardWidth * 0.5)) * 8, -8, 8));
            rotateX.setValue(clamp((gestureState.dy / (cardHeight * 0.45)) * -6, -6, 6));
          }
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (revealed && (gestureState.dx > cardWidth * 0.28 || gestureState.vx > 0.7)) {
            conceal();
          }
          if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
            if (revealed) {
              conceal();
            } else {
              reveal();
            }
          }
          Animated.parallel([
            Animated.timing(pressDepth, {
              toValue: 0,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true
            }),
            Animated.spring(rotateX, {
              toValue: 0,
              damping: 18,
              stiffness: 130,
              mass: 0.75,
              useNativeDriver: true
            }),
            Animated.spring(rotateY, {
              toValue: 0,
              damping: 18,
              stiffness: 130,
              mass: 0.75,
              useNativeDriver: true
            }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.timing(pressDepth, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.spring(rotateX, { toValue: 0, damping: 18, stiffness: 130, useNativeDriver: true }),
            Animated.spring(rotateY, { toValue: 0, damping: 18, stiffness: 130, useNativeDriver: true })
          ]).start();
        }
      }),
    [cardHeight, cardWidth, conceal, reveal, revealed, rotateX, rotateY, pressDepth]
  );

  const revealScale = revealProgress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.98, 0.99, 1.01],
    extrapolate: "clamp"
  });
  const pressScale = pressDepth.interpolate({ inputRange: [0, 1], outputRange: [0, 0.022] });
  const cardScale = Animated.add(revealScale, pressScale);
  const cardTiltX = Animated.add(rotateX, idle.interpolate({ inputRange: [-1, 1], outputRange: [-0.8, 0.8] }));
  const cardTiltY = Animated.add(rotateY, idle.interpolate({ inputRange: [-1, 1], outputRange: [1.1, -1.1] }));
  const cardMotionStyle = {
    opacity: entry,
    transform: [
      { translateY: entry.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
      { perspective: 1200 },
      { rotateX: cardTiltX.interpolate({ inputRange: [-8, 8], outputRange: ["-8deg", "8deg"] }) },
      { rotateY: cardTiltY.interpolate({ inputRange: [-8, 8], outputRange: ["-8deg", "8deg"] }) },
      { scale: cardScale }
    ]
  };

  const haloStyle = {
    opacity: Animated.add(
      Animated.add(entry.interpolate({ inputRange: [0, 1], outputRange: [0, 0.14] }), revealBloom.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] })),
      pressDepth.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] })
    ),
    transform: [
      {
        scale: Animated.add(
          Animated.add(entry.interpolate({ inputRange: [0, 1], outputRange: [0.92, 0.98] }), revealBloom.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] })),
      pressDepth.interpolate({ inputRange: [0, 1], outputRange: [0, 0.025] })
        )
      }
    ]
  };

  const frontFlipStyle = useAnimatedStyle(() => {
    const spin = interpolate(flipProgress.value, [0, 1], [0, 180]);
    const opacity = interpolate(flipProgress.value, [0, 0.48, 0.52, 1], [1, 1, 0, 0]);
    return {
      opacity,
      transform: [
        { perspective: 1200 },
        { rotateY: `${spin}deg` },
        { scale: interpolate(flipProgress.value, [0, 0.5, 1], [1, 0.975, 0.99]) }
      ]
    };
  });

  const backFlipStyle = useAnimatedStyle(() => {
    const spin = interpolate(flipProgress.value, [0, 1], [180, 360]);
    const opacity = interpolate(flipProgress.value, [0, 0.48, 0.52, 1], [0, 0, 1, 1]);
    return {
      opacity,
      transform: [
        { perspective: 1200 },
        { rotateY: `${spin}deg` },
        { scale: interpolate(flipProgress.value, [0, 0.5, 1], [0.985, 0.975, 1]) }
      ]
    };
  });

  const contentStyle = {
    opacity: content,
    transform: [
      { translateY: content.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
      { scale: content.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }
    ]
  };

  const particleStyle = {
    opacity: Animated.add(
      particles.interpolate({ inputRange: [0, 1], outputRange: [0, 0.32] }),
      revealBloom.interpolate({ inputRange: [0, 1], outputRange: [0, 0.14] })
    ),
    transform: [
      {
        translateY: Animated.add(
          particles.interpolate({ inputRange: [0, 1], outputRange: [10, -12] }),
          pressDepth.interpolate({ inputRange: [0, 1], outputRange: [0, -4] })
        )
      }
    ]
  };

  const frameParallaxStyle = {
    transform: [
      { translateX: cardTiltY.interpolate({ inputRange: [-8, 8], outputRange: [-3, 3] }) },
      { translateY: cardTiltX.interpolate({ inputRange: [-8, 8], outputRange: [2, -2] }) },
      { scale: 1.018 }
    ]
  };
  const artParallaxStyle = {
    transform: [
      { translateX: cardTiltY.interpolate({ inputRange: [-8, 8], outputRange: [-7, 7] }) },
      { translateY: cardTiltX.interpolate({ inputRange: [-8, 8], outputRange: [5, -5] }) },
      { scale: 1.035 }
    ]
  };

  const accent = roleTheme.accent;
  const auraColor = role === "Vampire" ? "rgba(233,195,73,0.18)" : roleTheme.glowOuter;

  return (
    <View style={[styles.outer, { maxWidth: maxColumnWidth, width: "100%" }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.backGlow, { backgroundColor: auraColor }, haloStyle]}
      />

      <Animated.View
        style={[styles.cardShell, { width: cardWidth, height: cardHeight }, cardMotionStyle]}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.shadowPlate,
            {
              shadowColor: colors.secondary,
              borderColor: `${accent}26`
            }
          ]}
        >
          <Animated.Image source={ROLE_REVEAL_FRAME} resizeMode="cover" style={[styles.frameImage, frameParallaxStyle]} />

          <Animated.View pointerEvents="none" style={[styles.particleLayer, particleStyle]}>
            <View style={[styles.spark, styles.sparkA, { backgroundColor: accent }]} />
            <View style={[styles.spark, styles.sparkB, { backgroundColor: accent }]} />
            <View style={[styles.spark, styles.sparkC, { backgroundColor: accent }]} />
          </Animated.View>

          <View style={[styles.cardClip, { borderColor: `${accent}55` }]}>
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,232,160,0.11)", "rgba(255,232,160,0.02)", "rgba(0,0,0,0.16)"]}
              locations={[0, 0.38, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.topHighlight}
            />
            <View pointerEvents="none" style={[styles.edgeGlow, { borderColor: `${accent}35` }]} />

            <Reanimated.View style={[styles.face, styles.front, frontFlipStyle]}>
              <RoleAuraAnimation role={role} color={accent} style={styles.closedAura} />
              <View style={styles.hiddenInner}>
                <View style={[styles.closedInnerFrame, { borderColor: `${accent}45` }]}>
                  <View style={[styles.cornerMark, styles.cornerMarkTopLeft, { borderColor: `${accent}55` }]} />
                  <View style={[styles.cornerMark, styles.cornerMarkTopRight, { borderColor: `${accent}55` }]} />
                  <View style={[styles.cornerMark, styles.cornerMarkBottomLeft, { borderColor: `${accent}55` }]} />
                  <View style={[styles.cornerMark, styles.cornerMarkBottomRight, { borderColor: `${accent}55` }]} />

                  <View style={styles.closedCrestTop}>
                    <View style={[styles.crestLine, { backgroundColor: `${accent}40` }]} />
                    <Ionicons name="sparkles-outline" size={18} color={colors.secondary} />
                    <View style={[styles.crestLine, { backgroundColor: `${accent}40` }]} />
                  </View>

                  <View
                    style={[
                      styles.closedSeal,
                      { borderColor: `${accent}66`, shadowColor: accent }
                    ]}
                  >
                    <LinearGradient
                      colors={["rgba(255,232,160,0.16)", "rgba(15,11,6,0.82)", "rgba(233,195,73,0.12)"]}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.closedSealInner}>
                      <Ionicons name="moon" size={52} color={colors.secondary} />
                    </View>
                  </View>

                  <View style={styles.hiddenTitleBlock}>
                    <View style={[styles.closedRule, { backgroundColor: `${accent}42` }]} />
                    <Text style={styles.closedHint}>Dokun — kimliğin açılsın</Text>
                    <View style={[styles.closedRule, { backgroundColor: `${accent}32` }]} />
                  </View>
                </View>
              </View>
            </Reanimated.View>

            <Reanimated.View style={[styles.face, styles.back, backFlipStyle]}>
              <Animated.View style={[styles.revealedContent, contentStyle]}>
                <View style={[styles.artFrame, { borderColor: `${accent}5c` }]}>
                  <RoleAuraAnimation role={role} color={accent} size={118} style={styles.artAura} />
                  {roleArt ? (
                    <Animated.View style={[styles.artParallaxWrap, artParallaxStyle]}>
                      <ImageBackground
                        source={roleArt}
                        resizeMode="cover"
                        style={[styles.art, { height: artHeight }]}
                        imageStyle={styles.artImage}
                      >
                      <LinearGradient
                        pointerEvents="none"
                        colors={[
                          `${accent}24`,
                          "rgba(5,5,7,0.12)",
                          "rgba(0,0,0,0.46)"
                        ]}
                        locations={[0, 0.48, 1]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <LinearGradient
                        pointerEvents="none"
                        colors={[
                          "rgba(0,0,0,0.0)",
                          "rgba(0,0,0,0.10)",
                          "rgba(0,0,0,0.62)"
                        ]}
                        locations={[0, 0.55, 1]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      </ImageBackground>
                    </Animated.View>
                  ) : (
                    <View style={[styles.fallbackArt, { height: artHeight }]}>
                      <Ionicons name={roleTheme.icon} size={72} color={accent} />
                    </View>
                  )}
                  <View style={[styles.roleIconBadge, { borderColor: `${accent}7a` }]}>
                    <Ionicons name={roleTheme.icon} size={17} color={accent} />
                  </View>
                </View>

                <View style={styles.titleBlock}>
                  <View style={styles.titleOrnament}>
                    <View style={[styles.titleLine, { backgroundColor: `${accent}40` }]} />
                    <Ionicons name="diamond-outline" size={9} color={accent} />
                    <View style={[styles.titleLine, { backgroundColor: `${accent}40` }]} />
                  </View>
                  <Text
                    style={[styles.roleTitle, { color: accent, fontSize: titleSize }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                  >
                    {role ? toRoleLabel(role) : "ROL BEKLENİYOR"}
                  </Text>
                </View>

                <View style={[styles.missionPanel, { borderColor: `${accent}28` }]}>
                  <Text
                    style={[
                      styles.mission,
                      { fontSize: missionSize, lineHeight: missionSize + 7 }
                    ]}
                    numberOfLines={compact ? 3 : 4}
                  >
                    {roleTheme.mission}
                  </Text>
                </View>

                {loverPartnerName ? (
                  <View style={[styles.loverPanel, { borderColor: `${accent}30` }]}>
                    <View style={styles.loverHeader}>
                      <Ionicons name="link-outline" size={13} color={colors.secondary} />
                      <Text style={styles.loverLabel}>Aşık Bağı</Text>
                    </View>
                    <Text style={styles.loverName} numberOfLines={1}>
                      {loverPartnerName}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.bottomBadgeRow}>
                  <View style={[styles.teamSeal, { borderColor: `${accent}55` }]}>
                    <Ionicons name={roleTheme.icon} size={11} color={accent} />
                    <Text style={[styles.teamSealText, { color: accent }]}>
                      {getTeamLabel(role)}
                    </Text>
                  </View>
                  <View style={styles.secretPill}>
                    <Ionicons name="eye-off-outline" size={11} color={colors.textDim} />
                    <Text style={styles.secretWarning}>Sadece sen gör</Text>
                  </View>
                </View>
              </Animated.View>
            </Reanimated.View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: "center",
    paddingTop: 0
  },
  backGlow: {
    position: "absolute",
    left: "4%",
    right: "4%",
    top: "7%",
    bottom: "8%",
    borderRadius: 999,
    ...(Platform.OS === "ios"
      ? {
          shadowOpacity: 0.78,
          shadowRadius: 78,
          shadowOffset: { width: 0, height: 18 }
        }
      : {
          elevation: 18
        })
  },
  cardShell: {
    alignSelf: "center"
  },
  shadowPlate: {
    width: "100%",
    height: "100%",
    borderWidth: 1,
    borderRadius: 28,
    backgroundColor: "rgba(6,7,9,0.96)",
    overflow: "hidden",
    shadowOpacity: 0.44,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12
  },
  frameImage: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    opacity: 0.9,
    transform: [{ scale: 1.015 }]
  },
  particleLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3
  },
  spark: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.7
  },
  sparkA: { left: "14%", top: "26%" },
  sparkB: { right: "12%", top: "38%" },
  sparkC: { left: "20%", bottom: "26%" },
  cardClip: {
    margin: 8,
    flex: 1,
    borderWidth: 1,
    borderRadius: 23,
    backgroundColor: "rgba(5,6,8,0.46)",
    overflow: "hidden"
  },
  topHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 92,
    zIndex: 1
  },
  edgeGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 23,
    borderWidth: 1,
    opacity: 0.75,
    zIndex: 2
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 23,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backfaceVisibility: "hidden"
  },
  front: {
    backgroundColor: "rgba(5,6,8,0.30)",
    alignItems: "center",
    justifyContent: "center"
  },
  closedAura: {
    top: "31%",
    alignSelf: "center"
  },
  back: {
    backgroundColor: "rgba(5,6,8,0.22)",
    alignItems: "center",
    justifyContent: "flex-start"
  },
  hiddenInner: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm
  },
  closedInnerFrame: {
    flex: 1,
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 34,
    backgroundColor: "rgba(5,6,8,0.18)"
  },
  cornerMark: {
    position: "absolute",
    width: 38,
    height: 38,
    opacity: 0.72
  },
  cornerMarkTopLeft: {
    top: 14,
    left: 14,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopLeftRadius: 13
  },
  cornerMarkTopRight: {
    top: 14,
    right: 14,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderTopRightRadius: 13
  },
  cornerMarkBottomLeft: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderBottomLeftRadius: 13
  },
  cornerMarkBottomRight: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomRightRadius: 13
  },
  closedCrestTop: {
    position: "absolute",
    top: 28,
    left: 34,
    right: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  crestLine: {
    flex: 1,
    height: 1
  },
  closedSeal: {
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOpacity: 0.34,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 }
  },
  closedSealInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.28)",
    backgroundColor: "rgba(11,10,8,0.64)",
    alignItems: "center",
    justifyContent: "center"
  },
  hiddenTitleBlock: {
    alignItems: "center",
    gap: 9
  },
  closedRule: {
    width: 134,
    height: 1
  },
  closedHint: {
    color: "#efd59a",
    fontFamily: typography.serifRegular,
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
    opacity: 0.9
  },
  revealedContent: {
    width: "100%",
    gap: 9,
    alignItems: "center"
  },
  artFrame: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(5,5,6,0.92)",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  artAura: {
    top: "12%",
    alignSelf: "center",
    zIndex: 1
  },
  art: {
    width: "100%",
    justifyContent: "flex-end",
    backgroundColor: "rgba(4,4,5,0.92)"
  },
  artParallaxWrap: {
    width: "100%"
  },
  artImage: {
    borderRadius: 17,
    transform: [{ scale: 1.02 }]
  },
  fallbackArt: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,10,12,0.76)"
  },
  roleIconBadge: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    backgroundColor: "rgba(5,5,7,0.7)",
    alignItems: "center",
    justifyContent: "center"
  },
  titleBlock: {
    width: "100%",
    alignItems: "center",
    marginTop: 3
  },
  titleOrnament: {
    width: "56%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 1
  },
  titleLine: {
    flex: 1,
    height: 1
  },
  roleTitle: {
    fontFamily: typography.serif,
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  missionPanel: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: "rgba(6,7,9,0.78)"
  },
  mission: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.serifRegular
  },
  loverPanel: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 2,
    backgroundColor: "rgba(35,20,22,0.56)"
  },
  loverHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  loverLabel: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  loverName: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 16,
    textAlign: "center"
  },
  bottomBadgeRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 0
  },
  teamSeal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "rgba(8,8,10,0.7)"
  },
  teamSealText: {
    fontFamily: typography.sansBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  secretPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.2)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "rgba(8,8,10,0.55)"
  },
  secretWarning: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 9.5
  }
});
