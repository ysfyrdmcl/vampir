import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions, Platform } from "react-native";
import type { Role } from "@vampir-koylu/shared";
import { LinearGradient } from "expo-linear-gradient";
import { ROLE_ART } from "../data/role-guide";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { getRoleTheme } from "../ui/role-theme";
import { uiStandard } from "../ui/ui-standard";
import { toRoleLabel } from "../utils/role-label";

interface RoleRevealCardProps {
  role: Role | null;
  loverPartnerName?: string | null;
  /** Üst sütun genişliği (RoleRevealScreen ile aynı). */
  maxColumnWidth?: number;
}

export function RoleRevealCard({ role, loverPartnerName, maxColumnWidth = 400 }: RoleRevealCardProps) {
  const [revealed, setRevealed] = useState(false);
  const rotate = useRef(new Animated.Value(0)).current;
  const entry = useRef(new Animated.Value(0)).current;
  const cardPop = useRef(new Animated.Value(0)).current;
  const glowOuter = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const ambientBreath = useRef(new Animated.Value(0)).current;
  const artAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const missionAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const sealPulse = useRef(new Animated.Value(0)).current;
  const { height: winH } = useWindowDimensions();
  const roleTheme = useMemo(() => getRoleTheme(role), [role]);
  const roleArt = role ? ROLE_ART[role] : null;

  const cardMinHeight = useMemo(() => Math.round(Math.min(400, Math.max(280, winH * 0.42))), [winH]);
  const artHeight = useMemo(() => Math.round(Math.min(238, Math.max(140, winH * 0.26))), [winH]);
  const titleSize = winH < 700 ? 26 : 30;
  const missionSize = winH < 700 ? 15 : 17;

  useEffect(() => {
    setRevealed(false);
    rotate.setValue(0);
    cardPop.setValue(0);
    entry.setValue(0);
    glowOuter.setValue(0);
    shimmer.setValue(0);
    ambientBreath.setValue(0);
    artAnim.setValue(0);
    titleAnim.setValue(0);
    missionAnim.setValue(0);
    badgeAnim.setValue(0);
    Animated.timing(entry, {
      toValue: 1,
      duration: 560,
      useNativeDriver: true
    }).start();
  }, [ambientBreath, artAnim, badgeAnim, cardPop, entry, glowOuter, missionAnim, role, rotate, shimmer, titleAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sealPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(sealPulse, { toValue: 0, duration: 1500, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sealPulse]);

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    const flip = Animated.spring(rotate, {
      toValue: 1,
      friction: 9,
      tension: 28,
      useNativeDriver: true
    });
    const tapPop = Animated.sequence([
      Animated.timing(cardPop, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true
      }),
      Animated.spring(cardPop, {
        toValue: 0,
        friction: 7,
        tension: 68,
        useNativeDriver: true
      })
    ]);
    const glowSurge = Animated.sequence([
      Animated.timing(glowOuter, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(glowOuter, { toValue: 0.55, duration: 600, useNativeDriver: true })
    ]);
    const shimmerShot = Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 40, useNativeDriver: true })
    ]);

    Animated.parallel([flip, tapPop, glowSurge]).start(({ finished }) => {
      if (!finished) return;
      const breathLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(ambientBreath, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(ambientBreath, { toValue: 0, duration: 1800, useNativeDriver: true })
        ])
      );
      breathLoop.start();
    });

    // Shimmer, flip ortasına yakın ateşlenir.
    setTimeout(() => {
      shimmerShot.start();
    }, 220);

    // İçerik kademeli giriş.
    Animated.sequence([
      Animated.delay(uiStandard.motion.cardSelectMs),
      Animated.parallel([
        Animated.timing(artAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(110),
          Animated.timing(titleAnim, { toValue: 1, duration: 260, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(missionAnim, { toValue: 1, duration: 280, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.delay(280),
          Animated.timing(badgeAnim, { toValue: 1, duration: 260, useNativeDriver: true })
        ])
      ])
    ]).start();
  };

  const frontRotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"]
  });
  const backRotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"]
  });

  const entryStyle = {
    opacity: entry,
    transform: [
      {
        translateY: entry.interpolate({
          inputRange: [0, 1],
          outputRange: [22, 0]
        })
      },
      {
        scale: entry.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1]
        })
      }
    ]
  };

  const popScale = cardPop.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06]
  });

  const outerGlowOpacity = Animated.add(
    glowOuter.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1] }),
    ambientBreath.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.35] })
  ).interpolate({ inputRange: [0, 1.35], outputRange: [0, 1], extrapolate: "clamp" });

  const outerGlowScale = Animated.add(
    glowOuter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }),
    ambientBreath.interpolate({ inputRange: [0, 1], outputRange: [0, 0.04] })
  );

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] });
  const shimmerTranslate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, 260] });

  const artIn = {
    opacity: artAnim,
    transform: [
      {
        translateY: artAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
      },
      {
        scale: artAnim.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] })
      }
    ]
  };
  const titleIn = {
    opacity: titleAnim,
    transform: [
      {
        translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] })
      }
    ]
  };
  const missionIn = {
    opacity: missionAnim,
    transform: [
      {
        translateY: missionAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
      }
    ]
  };
  const badgeIn = {
    opacity: badgeAnim,
    transform: [
      {
        translateY: badgeAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
      }
    ]
  };

  const sealScale = sealPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const sealGlow = sealPulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.22] });

  return (
    <Animated.View style={[styles.outer, { maxWidth: maxColumnWidth, width: "100%" }, entryStyle]}>
      <Pressable onPress={reveal} style={styles.press}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.backGlow,
            {
              backgroundColor: roleTheme.glowOuter,
              opacity: outerGlowOpacity,
              transform: [{ scale: outerGlowScale }]
            }
          ]}
        />
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: roleTheme.accent,
              shadowColor: roleTheme.accent,
              transform: [{ scale: popScale }]
            }
          ]}
        >
          <View style={[styles.flipStage, { height: cardMinHeight }]}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shimmer,
                {
                  opacity: shimmerOpacity,
                  transform: [{ translateX: shimmerTranslate }, { rotate: "-18deg" }, { skewX: "-12deg" }]
                }
              ]}
            >
              <LinearGradient
                colors={["rgba(233,195,73,0)", "rgba(255,246,214,0.58)", "rgba(233,195,73,0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.face,
                styles.front,
                {
                  transform: [{ perspective: 1200 }, { rotateY: frontRotation }]
                }
              ]}
            >
              <View style={[styles.corner, styles.cornerTL, { borderColor: "rgba(233,195,73,0.26)" }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: "rgba(233,195,73,0.26)" }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: "rgba(233,195,73,0.26)" }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: "rgba(233,195,73,0.26)" }]} />

              <Animated.View style={[styles.seal, { transform: [{ scale: sealScale }], shadowOpacity: sealGlow }]}>
                <Ionicons name="moon-outline" size={38} color={colors.secondary} />
              </Animated.View>

              <Text style={styles.backTitle}>GİZLİ KİMLİK</Text>
              <Text style={styles.backHint}>{revealed ? "Açılıyor…" : "Dokun — kimliğin açılsın"}</Text>

              <View style={styles.frontDivider} />
              <Text style={styles.frontSubcopy}>Ekranı sadece sen gör</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.face,
                styles.back,
                {
                  borderColor: roleTheme.accent,
                  transform: [{ perspective: 1200 }, { rotateY: backRotation }]
                }
              ]}
            >
              <Animated.View style={[styles.artWrap, artIn]}>
                {roleArt ? (
                  <ImageBackground
                    source={roleArt}
                    resizeMode="cover"
                    style={[styles.art, { height: artHeight }]}
                    imageStyle={styles.artImage}
                  >
                    <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.42)", "rgba(0,0,0,0.68)"]} style={styles.artShade} />
                    <LinearGradient
                      colors={["rgba(233,195,73,0.0)", "rgba(233,195,73,0.14)", "rgba(233,195,73,0.0)"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.artGoldSheen}
                    />
                    <View style={[styles.roleIconBadge, { borderColor: roleTheme.accent, backgroundColor: "rgba(10,10,12,0.55)" }]}>
                      <Ionicons name={roleTheme.icon} size={24} color={roleTheme.accent} />
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={[styles.iconWrap, { borderColor: roleTheme.accent, shadowColor: roleTheme.accent }]}>
                    <Ionicons name={roleTheme.icon} size={70} color={roleTheme.accent} />
                  </View>
                )}
              </Animated.View>

              <Animated.View style={titleIn}>
                <Text style={[styles.roleTitle, { color: roleTheme.accent, fontSize: titleSize }]}>
                  {role ? toRoleLabel(role) : "ROL BEKLENİYOR"}
                </Text>
              </Animated.View>

              <Animated.View style={missionIn}>
                <Text style={[styles.mission, { fontSize: missionSize, lineHeight: missionSize + 9 }]} numberOfLines={4}>
                  {roleTheme.mission}
                </Text>
              </Animated.View>

              <Animated.View style={badgeIn}>
                {loverPartnerName ? (
                  <View style={styles.loverPanel}>
                    <View style={styles.loverHeader}>
                      <Ionicons name="link-outline" size={16} color={colors.secondary} />
                      <Text style={styles.loverLabel}>Aşık Bağı</Text>
                    </View>
                    <Text style={styles.loverName} numberOfLines={1}>
                      {loverPartnerName}
                    </Text>
                    <Text style={styles.loverHint}>Bağlı oyuncun. Rolü gizli kalır.</Text>
                  </View>
                ) : null}

                <View style={styles.secretPill}>
                  <Ionicons name="eye-off-outline" size={14} color={colors.textDim} />
                  <Text style={styles.secretWarning}>Sadece sen gör</Text>
                </View>
              </Animated.View>
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: "center"
  },
  press: {
    width: "100%"
  },
  backGlow: {
    position: "absolute",
    left: "-10%",
    right: "-10%",
    top: "8%",
    bottom: "10%",
    borderRadius: 999,
    zIndex: 0,
    ...(Platform.OS === "ios"
      ? {
          shadowOpacity: 0.6,
          shadowRadius: 72,
          shadowOffset: { width: 0, height: 18 }
        }
      : {
          elevation: 18
        })
  },
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    backgroundColor: "rgba(9,10,11,0.92)",
    shadowOpacity: 0.38,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    overflow: "hidden",
    zIndex: 1
  },
  flipStage: {
    width: "100%",
    backgroundColor: "rgba(8,8,10,0.35)"
  },
  shimmer: {
    position: "absolute",
    top: "-30%",
    bottom: "-30%",
    width: 92,
    left: 0,
    zIndex: 4,
    opacity: 0.0
  },
  face: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    zIndex: 1
  },
  front: {
    gap: 14,
    backgroundColor: "rgba(11,11,13,0.97)"
  },
  back: {
    gap: 10,
    backgroundColor: "rgba(10,11,13,0.97)",
    borderWidth: 1
  },
  iconWrap: {
    width: 132,
    height: 132,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "rgba(18,18,20,0.88)",
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }
  },
  seal: {
    width: 108,
    height: 108,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.38)",
    backgroundColor: "rgba(35,29,18,0.78)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#e9c349",
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  corner: {
    position: "absolute",
    width: 18,
    height: 18,
    borderWidth: 1,
    borderRadius: 4,
    opacity: 0.8
  },
  cornerTL: { left: 16, top: 16, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { right: 16, top: 16, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { left: 16, bottom: 16, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { right: 16, bottom: 16, borderLeftWidth: 0, borderTopWidth: 0 },
  frontDivider: {
    width: 86,
    height: 1,
    backgroundColor: "rgba(233,195,73,0.22)",
    marginTop: 2
  },
  frontSubcopy: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  artWrap: {
    width: "100%"
  },
  art: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.26)"
  },
  artImage: {
    borderRadius: 16
  },
  artShade: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1
  },
  artGoldSheen: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55
  },
  roleIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 12
  },
  backTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 13,
    letterSpacing: 2.4,
    textTransform: "uppercase"
  },
  backHint: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: spacing.md
  },
  roleTitle: {
    fontFamily: typography.serif,
    textAlign: "center",
    letterSpacing: 0.8
  },
  mission: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.serifRegular,
    paddingHorizontal: spacing.xs
  },
  secretWarning: {
    color: colors.textDim,
    textAlign: "center",
    fontFamily: typography.sansMedium,
    fontSize: 11
  },
  secretPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(8,8,10,0.55)",
    marginTop: 2
  },
  loverPanel: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.26)",
    borderRadius: 14,
    padding: 10,
    gap: 4,
    backgroundColor: "rgba(35,29,18,0.56)"
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
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  loverName: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 20,
    textAlign: "center"
  },
  loverHint: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    textAlign: "center"
  }
});
