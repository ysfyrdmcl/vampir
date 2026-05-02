import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { Role } from "@vampir-koylu/shared";
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
  const roleTheme = useMemo(() => getRoleTheme(role), [role]);

  useEffect(() => {
    setRevealed(false);
    rotate.setValue(0);
  }, [role, rotate]);

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    Animated.timing(rotate, {
      toValue: 1,
      duration: uiStandard.motion.cardRevealMs,
      useNativeDriver: true
    }).start();
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
        <Animated.View style={[styles.face, styles.front, { transform: [{ rotateY: frontRotation }] }]}>
          <Ionicons name="albums-outline" size={46} color={colors.secondary} />
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
          <View style={[styles.iconWrap, { borderColor: roleTheme.accent, shadowColor: roleTheme.accent }]}>
            <Ionicons name={roleTheme.icon} size={70} color={roleTheme.accent} />
          </View>
          <Text style={[styles.roleTitle, { color: roleTheme.accent }]}>{role ? toRoleLabel(role) : "ROL BEKLENİYOR"}</Text>
          <Text style={styles.mission}>{roleTheme.mission}</Text>
          <Text style={styles.secretWarning}>Ekranı sadece sen gör. Rolünü kimseyle paylaşma.</Text>
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
    minHeight: 408,
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: "rgba(9,10,11,0.84)",
    shadowOpacity: 0.33,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }
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
    fontSize: 13,
    lineHeight: 18
  }
});
