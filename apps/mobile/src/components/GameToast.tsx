import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToastStore, type GameToastPayload } from "../ui/toast-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface GameToastProps {
  topOffset?: number;
}

export function GameToast({ topOffset }: GameToastProps) {
  const insets = useSafeAreaInsets();
  const toast = useToastStore((s) => s.toast);
  const clearToast = useToastStore((s) => s.clearToast);
  const [activeToast, setActiveToast] = useState<GameToastPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;
    if (toast.variant !== "danger") {
      setActiveToast(null);
      clearToast(toast.id);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[CINEMATIC_OVERLAY] compact_show", {
        kind: "system-feedback",
        id: toast.id
      });
    }
    setActiveToast(toast);
    opacity.setValue(0);
    translateY.setValue(-10);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true })
    ]).start(() => {
      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -10, duration: 220, useNativeDriver: true })
        ]).start(() => {
          setActiveToast(null);
          clearToast(toast.id);
        });
      }, toast.durationMs);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, opacity, translateY, clearToast]);

  if (!activeToast) return null;
  if (activeToast.variant !== "danger") return null;

  return (
    <Animated.View
      style={[styles.wrap, { top: topOffset ?? insets.top + 10, opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <View style={styles.toast}>
        <View style={styles.iconWrap}>
          <Ionicons name="warning-outline" size={18} color="#ffb8ac" />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            Kritik Uyarı
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {activeToast.text}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 60,
    elevation: 30
  },
  toast: {
    width: "100%",
    maxWidth: 360,
    minHeight: 68,
    borderWidth: 1,
    borderColor: "rgba(255,121,104,0.42)",
    borderRadius: 14,
    backgroundColor: "rgba(24,10,12,0.98)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,121,104,0.36)",
    backgroundColor: "rgba(80,18,20,0.86)",
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  title: {
    color: "#ffb8ac",
    fontFamily: typography.sansBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: "uppercase"
  },
  body: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1
  }
});
