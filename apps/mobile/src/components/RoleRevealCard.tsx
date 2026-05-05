import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
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
  maxColumnWidth?: number;
}

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
  maxColumnWidth = 400
}: RoleRevealCardProps) {
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
  const lightBurst = useRef(new Animated.Value(0)).current;
  const shard0Y = useRef(new Animated.Value(0)).current;
  const shard1Y = useRef(new Animated.Value(0)).current;
  const shard2Y = useRef(new Animated.Value(0)).current;
  const shard3Y = useRef(new Animated.Value(0)).current;
  const shard0Op = useRef(new Animated.Value(0)).current;
  const shard1Op = useRef(new Animated.Value(0)).current;
  const shard2Op = useRef(new Animated.Value(0)).current;
  const shard3Op = useRef(new Animated.Value(0)).current;

  const { height: winH } = useWindowDimensions();
  const roleTheme = useMemo(() => getRoleTheme(role), [role]);
  const roleArt = role ? ROLE_ART[role] : null;

  const cardMinHeight = useMemo(
    () => Math.round(Math.min(440, Math.max(320, winH * 0.47))),
    [winH]
  );
  const artHeight = useMemo(
    () => Math.round(Math.min(250, Math.max(150, winH * 0.27))),
    [winH]
  );
  const titleSize = winH < 700 ? 24 : 28;
  const missionSize = winH < 700 ? 13 : 15;

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

  useEffect(() => {
    const makeShard = (y: Animated.Value, op: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(y, { toValue: 1, duration: 3200, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(op, { toValue: 0.42, duration: 700, useNativeDriver: true }),
              Animated.timing(op, { toValue: 0, duration: 1800, useNativeDriver: true })
            ])
          ]),
          Animated.parallel([
            Animated.timing(y, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: 0, useNativeDriver: true })
          ])
        ])
      );
    const loops = [
      makeShard(shard0Y, shard0Op, 0),
      makeShard(shard1Y, shard1Op, 800),
      makeShard(shard2Y, shard2Op, 1600),
      makeShard(shard3Y, shard3Op, 2400)
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [shard0Op, shard0Y, shard1Op, shard1Y, shard2Op, shard2Y, shard3Op, shard3Y]);

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);

    Animated.parallel([
      Animated.spring(rotate, { toValue: 1, friction: 9, tension: 28, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(cardPop, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(cardPop, { toValue: 0, friction: 7, tension: 68, useNativeDriver: true })
      ]),
      Animated.sequence([
        Animated.timing(glowOuter, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(glowOuter, { toValue: 0.55, duration: 600, useNativeDriver: true })
      ])
    ]).start(({ finished }) => {
      if (!finished) return;
      Animated.loop(
        Animated.sequence([
          Animated.timing(ambientBreath, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(ambientBreath, { toValue: 0, duration: 1800, useNativeDriver: true })
        ])
      ).start();
    });

    setTimeout(() => {
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 40, useNativeDriver: true })
      ]).start();
    }, 220);

    setTimeout(() => {
      Animated.sequence([
        Animated.timing(lightBurst, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(lightBurst, { toValue: 0, duration: 380, useNativeDriver: true })
      ]).start();
    }, 240);

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

  const frontRotation = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotation = rotate.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  const entryStyle = {
    opacity: entry,
    transform: [
      { translateY: entry.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
      { scale: entry.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }
    ]
  };

  const popScale = cardPop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const outerGlowOpacity = Animated.add(
    glowOuter.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1] }),
    ambientBreath.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.35] })
  ).interpolate({ inputRange: [0, 1.35], outputRange: [0, 1], extrapolate: "clamp" });

  const outerGlowScale = Animated.add(
    glowOuter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.1] }),
    ambientBreath.interpolate({ inputRange: [0, 1], outputRange: [0, 0.04] })
  );

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] });
  const shimmerTranslate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, 260] });
  const lightBurstOpacity = lightBurst.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.52, 0]
  });

  const artIn = {
    opacity: artAnim,
    transform: [
      { translateY: artAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      { scale: artAnim.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }
    ]
  };
  const titleIn = {
    opacity: titleAnim,
    transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }]
  };
  const missionIn = {
    opacity: missionAnim,
    transform: [{ translateY: missionAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
  };
  const badgeIn = {
    opacity: badgeAnim,
    transform: [{ translateY: badgeAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
  };

  const sealScale = sealPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const sealGlow = sealPulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.26] });

  const s0Trans = shard0Y.interpolate({ inputRange: [0, 1], outputRange: [0, -32] });
  const s1Trans = shard1Y.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const s2Trans = shard2Y.interpolate({ inputRange: [0, 1], outputRange: [0, -38] });
  const s3Trans = shard3Y.interpolate({ inputRange: [0, 1], outputRange: [0, -26] });

  const accent = roleTheme.accent;

  return (
    <Animated.View style={[styles.outer, { maxWidth: maxColumnWidth, width: "100%" }, entryStyle]}>
      {/* Oval radial glow behind card */}
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
      {/* Light burst flash on reveal */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.lightBurst,
          { opacity: lightBurstOpacity, backgroundColor: roleTheme.glowOuter }
        ]}
      />
      {/* Floating smoke shards */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shard,
          styles.shard0,
          {
            backgroundColor: `${accent}80`,
            opacity: shard0Op,
            transform: [{ translateY: s0Trans }, { rotate: "45deg" }]
          }
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shard,
          styles.shard1,
          {
            backgroundColor: `${accent}66`,
            opacity: shard1Op,
            transform: [{ translateY: s1Trans }, { rotate: "30deg" }]
          }
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shard,
          styles.shard2,
          {
            backgroundColor: `${accent}70`,
            opacity: shard2Op,
            transform: [{ translateY: s2Trans }, { rotate: "60deg" }]
          }
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shard,
          styles.shard3,
          {
            backgroundColor: `${accent}55`,
            opacity: shard3Op,
            transform: [{ translateY: s3Trans }, { rotate: "15deg" }]
          }
        ]}
      />

      {/* Crest plate — centered above frame */}
      <View style={styles.crestWrap}>
        <View
          style={[
            styles.crestPlate,
            { borderColor: `${accent}70`, backgroundColor: "rgba(6,6,8,0.97)" }
          ]}
        >
          <Ionicons name="shield-outline" size={11} color={accent} />
          <Text style={[styles.crestText, { color: accent }]}>VAMPIR KÖYLÜ</Text>
        </View>
      </View>

      {/* Outer frame with corner ornaments */}
      <View style={[styles.frameOuter, { borderColor: `${accent}20` }]}>
        <View style={[styles.fCorner, styles.fCornerTL, { borderColor: `${accent}90` }]} />
        <View style={[styles.fCorner, styles.fCornerTR, { borderColor: `${accent}90` }]} />
        <View style={[styles.fCorner, styles.fCornerBL, { borderColor: `${accent}90` }]} />
        <View style={[styles.fCorner, styles.fCornerBR, { borderColor: `${accent}90` }]} />

        <Pressable onPress={reveal} style={styles.press}>
          <Animated.View
            style={[
              styles.card,
              {
                borderColor: accent,
                shadowColor: accent,
                transform: [{ scale: popScale }]
              }
            ]}
          >
            <View style={[styles.flipStage, { height: cardMinHeight }]}>
              {/* Shimmer sweep */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.shimmer,
                  {
                    opacity: shimmerOpacity,
                    transform: [
                      { translateX: shimmerTranslate },
                      { rotate: "-18deg" },
                      { skewX: "-12deg" }
                    ]
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

              {/* ── FRONT face (closed card) ── */}
              <Animated.View
                style={[
                  styles.face,
                  styles.front,
                  { transform: [{ perspective: 1200 }, { rotateY: frontRotation }] }
                ]}
              >
                {/* Inner corner ornaments */}
                <View style={[styles.corner, styles.cornerTL, { borderColor: `${accent}60` }]} />
                <View style={[styles.corner, styles.cornerTR, { borderColor: `${accent}60` }]} />
                <View style={[styles.corner, styles.cornerBL, { borderColor: `${accent}60` }]} />
                <View style={[styles.corner, styles.cornerBR, { borderColor: `${accent}60` }]} />
                {/* Top gothic inscription */}
                <Text style={styles.frontInscription}>◈  VAMPIR KÖYLÜ  ◈</Text>
                {/* Seal flanked by ornamental lines */}
                <View style={styles.sealRow}>
                  <View style={[styles.sealFlank, { backgroundColor: `${accent}35` }]} />
                  <Animated.View
                    style={[
                      styles.seal,
                      { transform: [{ scale: sealScale }], shadowOpacity: sealGlow }
                    ]}
                  >
                    <View style={styles.sealInner}>
                      <Ionicons name="moon-outline" size={40} color={colors.secondary} />
                    </View>
                  </Animated.View>
                  <View style={[styles.sealFlank, { backgroundColor: `${accent}35` }]} />
                </View>
                <Text style={styles.backTitle}>GİZLİ KİMLİK</Text>
                <View style={styles.frontDivider} />
                <Text style={styles.backHint}>
                  {revealed ? "Açılıyor…" : "Dokun — kimliğin açılsın"}
                </Text>
                {/* Bottom subcopy */}
                <Text style={styles.frontSubcopy}>Ekranı sadece sen gör</Text>
              </Animated.View>

              {/* ── BACK face (revealed) ── */}
              <Animated.View
                style={[
                  styles.face,
                  styles.back,
                  styles.backContent,
                  {
                    borderColor: accent,
                    transform: [{ perspective: 1200 }, { rotateY: backRotation }]
                  }
                ]}
              >
                {/* Art window with title overlay */}
                <Animated.View style={[styles.artWrap, artIn]}>
                  {roleArt ? (
                    <ImageBackground
                      source={roleArt}
                      resizeMode="cover"
                      style={[styles.art, { height: artHeight }]}
                      imageStyle={styles.artImage}
                    >
                      {/* Dark bottom gradient for title legibility */}
                      <LinearGradient
                        colors={[
                          "rgba(0,0,0,0.04)",
                          "rgba(0,0,0,0.44)",
                          "rgba(0,0,0,0.88)"
                        ]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      {/* Subtle gold sheen */}
                      <LinearGradient
                        colors={[
                          "rgba(233,195,73,0.0)",
                          "rgba(233,195,73,0.06)",
                          "rgba(233,195,73,0.0)"
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      {/* Role icon badge — top right */}
                      <View
                        style={[
                          styles.roleIconBadge,
                          { borderColor: accent, backgroundColor: "rgba(8,8,10,0.62)" }
                        ]}
                      >
                        <Ionicons name={roleTheme.icon} size={20} color={accent} />
                      </View>
                      {/* Title overlaid on bottom of art */}
                      <Animated.View style={[styles.artTitleOverlay, titleIn]}>
                        <Text
                          style={[styles.roleTitle, { color: accent, fontSize: titleSize }]}
                          numberOfLines={1}
                        >
                          {role ? toRoleLabel(role) : "ROL BEKLENİYOR"}
                        </Text>
                      </Animated.View>
                    </ImageBackground>
                  ) : (
                    <View
                      style={[
                        styles.iconWrap,
                        { borderColor: accent, shadowColor: accent }
                      ]}
                    >
                      <Ionicons name={roleTheme.icon} size={64} color={accent} />
                    </View>
                  )}
                </Animated.View>

                {/* Title below (no-art fallback) */}
                {!roleArt ? (
                  <Animated.View style={titleIn}>
                    <Text style={[styles.roleTitle, { color: accent, fontSize: titleSize }]}>
                      {role ? toRoleLabel(role) : "ROL BEKLENİYOR"}
                    </Text>
                  </Animated.View>
                ) : null}

                {/* Ornamental divider */}
                <Animated.View style={[styles.ornamentRow, missionIn]}>
                  <View style={[styles.ornamentLine, { backgroundColor: `${accent}44` }]} />
                  <Ionicons name="diamond-outline" size={8} color={accent} />
                  <View style={[styles.ornamentLine, { backgroundColor: `${accent}44` }]} />
                </Animated.View>

                {/* Mission inset panel */}
                <Animated.View style={missionIn}>
                  <View style={[styles.missionPanel, { borderColor: `${accent}28` }]}>
                    <Text
                      style={[
                        styles.mission,
                        { fontSize: missionSize, lineHeight: missionSize + 9 }
                      ]}
                      numberOfLines={4}
                    >
                      {roleTheme.mission}
                    </Text>
                  </View>
                </Animated.View>

                {/* Bottom seal + badges */}
                <Animated.View style={badgeIn}>
                  {loverPartnerName ? (
                    <View style={styles.loverPanel}>
                      <View style={styles.loverHeader}>
                        <Ionicons name="link-outline" size={15} color={colors.secondary} />
                        <Text style={styles.loverLabel}>Aşık Bağı</Text>
                      </View>
                      <Text style={styles.loverName} numberOfLines={1}>
                        {loverPartnerName}
                      </Text>
                      <Text style={styles.loverHint}>Bağlı oyuncun. Rolü gizli kalır.</Text>
                    </View>
                  ) : null}
                  <View style={styles.bottomBadgeRow}>
                    <Animated.View
                      style={[
                        styles.teamSeal,
                        { borderColor: `${accent}55` },
                        { transform: [{ scale: sealScale }] }
                      ]}
                    >
                      <Ionicons name={roleTheme.icon} size={12} color={accent} />
                      <Text style={[styles.teamSealText, { color: accent }]}>
                        {getTeamLabel(role)}
                      </Text>
                    </Animated.View>
                    <View style={styles.secretPill}>
                      <Ionicons name="eye-off-outline" size={12} color={colors.textDim} />
                      <Text style={styles.secretWarning}>Sadece sen gör</Text>
                    </View>
                  </View>
                </Animated.View>
              </Animated.View>
            </View>
          </Animated.View>
        </Pressable>
      </View>
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
    left: "12%",
    right: "12%",
    top: "14%",
    bottom: "22%",
    borderRadius: 999,
    zIndex: 0,
    ...(Platform.OS === "ios"
      ? {
          shadowOpacity: 0.74,
          shadowRadius: 90,
          shadowOffset: { width: 0, height: 24 }
        }
      : {
          elevation: 22
        })
  },
  lightBurst: {
    position: "absolute",
    left: "5%",
    right: "5%",
    top: "8%",
    bottom: "8%",
    borderRadius: 999,
    zIndex: 0
  },
  shard: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 1,
    zIndex: 0
  },
  shard0: { left: "8%", bottom: "30%" },
  shard1: { right: "10%", bottom: "46%" },
  shard2: { left: "14%", bottom: "62%" },
  shard3: { right: "16%", bottom: "36%" },
  crestWrap: {
    position: "absolute",
    top: 2,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 5
  },
  crestPlate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: 999
  },
  crestText: {
    fontFamily: typography.sansBold,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: "uppercase"
  },
  frameOuter: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 24,
    marginTop: 18,
    zIndex: 1
  },
  fCorner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderWidth: 2,
    zIndex: 3
  },
  fCornerTL: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 22
  },
  fCornerTR: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 22
  },
  fCornerBL: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 22
  },
  fCornerBR: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 22
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
    gap: 10,
    backgroundColor: "rgba(11,11,13,0.97)"
  },
  back: {
    gap: 8,
    backgroundColor: "rgba(10,11,13,0.97)",
    borderWidth: 1
  },
  backContent: {
    justifyContent: "flex-start",
    paddingVertical: 10
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 4,
    opacity: 0.85
  },
  cornerTL: { left: 14, top: 14, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { right: 14, top: 14, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { left: 14, bottom: 14, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { right: 14, bottom: 14, borderLeftWidth: 0, borderTopWidth: 0 },
  frontInscription: {
    position: "absolute",
    top: 16,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "rgba(233,195,73,0.28)",
    fontFamily: typography.sansBold,
    fontSize: 9,
    letterSpacing: 2.4,
    textTransform: "uppercase"
  },
  sealRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 8
  },
  sealFlank: {
    flex: 1,
    height: 1
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
  sealInner: {
    width: 86,
    height: 86,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.16)",
    backgroundColor: "rgba(20,16,8,0.62)",
    alignItems: "center",
    justifyContent: "center"
  },
  frontDivider: {
    width: 86,
    height: 1,
    backgroundColor: "rgba(233,195,73,0.22)",
    marginTop: 2
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
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: spacing.md
  },
  frontSubcopy: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: "center",
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  artWrap: {
    width: "100%"
  },
  art: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.26)"
  },
  artImage: {
    borderRadius: 14
  },
  roleIconBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  artTitleOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 10,
    paddingHorizontal: 14,
    alignItems: "center"
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "rgba(18,18,20,0.88)",
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }
  },
  roleTitle: {
    fontFamily: typography.serif,
    textAlign: "center",
    letterSpacing: 0.8
  },
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 8,
    paddingHorizontal: spacing.sm
  },
  ornamentLine: {
    flex: 1,
    height: 1
  },
  missionPanel: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "rgba(8,9,11,0.84)",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  mission: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.serifRegular
  },
  bottomBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%"
  },
  teamSeal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(8,8,10,0.62)"
  },
  teamSealText: {
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  secretPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(8,8,10,0.55)"
  },
  secretWarning: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 10
  },
  loverPanel: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.26)",
    borderRadius: 12,
    padding: 9,
    gap: 3,
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
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  loverName: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 18,
    textAlign: "center"
  },
  loverHint: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 10,
    textAlign: "center"
  }
});
