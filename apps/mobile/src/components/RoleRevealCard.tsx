import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { Role } from "@vampir-koylu/shared";
import { ROLE_ART } from "../data/role-guide";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { getRoleTheme } from "../ui/role-theme";
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
  const glow = useRef(new Animated.Value(0)).current;
  const entry = useRef(new Animated.Value(0)).current;
  const cardPop = useRef(new Animated.Value(0)).current;
  const { height: winH } = useWindowDimensions();
  const roleTheme = useMemo(() => getRoleTheme(role), [role]);
  const roleArt = role ? ROLE_ART[role] : null;

  const cardMinHeight = useMemo(() => Math.round(Math.min(400, Math.max(280, winH * 0.42))), [winH]);
  const artHeight = useMemo(() => Math.round(Math.min(220, Math.max(132, winH * 0.24))), [winH]);
  const titleSize = winH < 700 ? 26 : 30;
  const missionSize = winH < 700 ? 15 : 17;

  useEffect(() => {
    setRevealed(false);
    rotate.setValue(0);
    glow.setValue(0);
    cardPop.setValue(0);
    entry.setValue(0);
    Animated.timing(entry, {
      toValue: 1,
      duration: 560,
      useNativeDriver: true
    }).start();
  }, [cardPop, entry, glow, role, rotate]);

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    Animated.parallel([
      Animated.spring(rotate, {
        toValue: 1,
        friction: 9,
        tension: 32,
        useNativeDriver: true
      }),
      Animated.sequence([
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
      ]),
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true
        }),
        Animated.timing(glow, {
          toValue: 0.5,
          duration: 640,
          useNativeDriver: true
        })
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

  return (
    <Animated.View style={[styles.outer, { maxWidth: maxColumnWidth, width: "100%" }, entryStyle]}>
      <Pressable onPress={reveal} style={styles.press}>
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
                styles.revealGlow,
                {
                  backgroundColor: roleTheme.glow,
                  opacity: glow,
                  transform: [
                    {
                      scale: glow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.82, 1.12]
                      })
                    }
                  ]
                }
              ]}
            />
            <Animated.View style={[styles.face, styles.front, { transform: [{ rotateY: frontRotation }] }]}>
              <View style={styles.seal}>
                <Ionicons name="moon-outline" size={36} color={colors.secondary} />
              </View>
              <Text style={styles.backTitle}>GİZLİ KİMLİK</Text>
              <Text style={styles.backHint}>{revealed ? "Açılıyor…" : "Dokun — rolün ortaya çıksın"}</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.face,
                styles.back,
                { transform: [{ rotateY: backRotation }], borderColor: roleTheme.accent }
              ]}
            >
              {roleArt ? (
                <ImageBackground
                  source={roleArt}
                  resizeMode="cover"
                  style={[styles.art, { height: artHeight }]}
                  imageStyle={styles.artImage}
                >
                  <View style={styles.artShade} />
                  <View style={[styles.roleIconBadge, { borderColor: roleTheme.accent, backgroundColor: roleTheme.glow }]}>
                    <Ionicons name={roleTheme.icon} size={24} color={roleTheme.accent} />
                  </View>
                </ImageBackground>
              ) : (
                <View style={[styles.iconWrap, { borderColor: roleTheme.accent, shadowColor: roleTheme.accent }]}>
                  <Ionicons name={roleTheme.icon} size={70} color={roleTheme.accent} />
                </View>
              )}
              <Text style={[styles.roleTitle, { color: roleTheme.accent, fontSize: titleSize }]}>
                {role ? toRoleLabel(role) : "ROL BEKLENİYOR"}
              </Text>
              <Text style={[styles.mission, { fontSize: missionSize, lineHeight: missionSize + 9 }]} numberOfLines={4}>
                {roleTheme.mission}
              </Text>
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
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    backgroundColor: "rgba(9,10,11,0.9)",
    shadowOpacity: 0.38,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    overflow: "hidden"
  },
  flipStage: {
    width: "100%",
    transform: [{ perspective: 1400 }]
  },
  revealGlow: {
    position: "absolute",
    left: "8%",
    right: "8%",
    top: "12%",
    bottom: "18%",
    borderRadius: 160,
    zIndex: 0
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
    justifyContent: "center"
  },
  art: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.24)"
  },
  artImage: {
    borderRadius: 16
  },
  artShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.26)"
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
