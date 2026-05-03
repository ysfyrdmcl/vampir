import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import type { Role } from "@vampir-koylu/shared";
import { ROLE_ART } from "../data/role-guide";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";
import { getRoleTheme } from "../ui/role-theme";
import { toRoleLabel } from "../utils/role-label";

interface RoleRevealCardProps {
  role: Role | null;
}

export function RoleRevealCard({ role }: RoleRevealCardProps) {
  const [revealed, setRevealed] = useState(false);
  const rotate = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const roleTheme = useMemo(() => getRoleTheme(role), [role]);
  const roleArt = role ? ROLE_ART[role] : null;

  useEffect(() => {
    setRevealed(false);
    rotate.setValue(0);
    glow.setValue(0);
  }, [glow, role, rotate]);

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    Animated.parallel([
      Animated.timing(rotate, {
        toValue: 1,
        duration: uiStandard.motion.cardRevealMs,
        useNativeDriver: true
      }),
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true
        }),
        Animated.timing(glow, {
          toValue: 0.48,
          duration: 720,
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

  return (
    <Pressable onPress={reveal} style={styles.wrap}>
      <View style={[styles.card, { borderColor: roleTheme.accent, shadowColor: roleTheme.accent }]}>
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
                    outputRange: [0.85, 1.08]
                  })
                }
              ]
            }
          ]}
        />
        <Animated.View style={[styles.face, styles.front, { transform: [{ rotateY: frontRotation }] }]}>
          <View style={styles.seal}>
            <Ionicons name="albums-outline" size={42} color={colors.secondary} />
          </View>
          <Text style={styles.backTitle}>GİZLİ KART</Text>
          <Text style={styles.backHint}>{revealed ? "Kart açılıyor..." : "Dokun ve rolünü gör"}</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.face,
            styles.back,
            { transform: [{ rotateY: backRotation }], borderColor: roleTheme.accent }
          ]}
        >
          {roleArt ? (
            <ImageBackground source={roleArt} resizeMode="cover" style={styles.art} imageStyle={styles.artImage}>
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
          <Text style={[styles.roleTitle, { color: roleTheme.accent }]}>{role ? toRoleLabel(role) : "ROL BEKLENİYOR"}</Text>
          <Text style={styles.mission}>{roleTheme.mission}</Text>
          <View style={styles.secretPill}>
            <Ionicons name="eye-off-outline" size={14} color={colors.textDim} />
            <Text style={styles.secretWarning}>Sadece sen gör</Text>
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center"
  },
  card: {
    width: "100%",
    minHeight: 444,
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: "rgba(9,10,11,0.84)",
    shadowOpacity: 0.33,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    overflow: "hidden"
  },
  revealGlow: {
    position: "absolute",
    left: 28,
    right: 28,
    top: 58,
    height: 280,
    borderRadius: 160
  },
  face: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden"
  },
  front: {
    gap: 12,
    backgroundColor: "rgba(11,11,13,0.95)"
  },
  back: {
    gap: 12,
    backgroundColor: "rgba(10,11,13,0.95)",
    borderWidth: 1
  },
  iconWrap: {
    width: 148,
    height: 148,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "rgba(18,18,20,0.82)",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }
  },
  seal: {
    width: 104,
    height: 104,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.34)",
    backgroundColor: "rgba(35,29,18,0.72)",
    alignItems: "center",
    justifyContent: "center"
  },
  art: {
    width: "100%",
    height: 230,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.22)"
  },
  artImage: {
    borderRadius: 16
  },
  artShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.22)"
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
    letterSpacing: 2.2
  },
  backHint: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  roleTitle: {
    fontFamily: typography.serif,
    fontSize: 62 / 1.5,
    textAlign: "center",
    letterSpacing: 1.1
  },
  mission: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.serifRegular,
    fontSize: 18,
    lineHeight: 28
  },
  secretWarning: {
    color: colors.textDim,
    textAlign: "center",
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  secretPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.2)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(8,8,10,0.5)"
  }
});
