import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { useToastStore, type GameToastPayload } from "../ui/toast-store";

export function GameToast() {
  const insets = useSafeAreaInsets();
  const toast = useToastStore((s) => s.toast);
  const clearToast = useToastStore((s) => s.clearToast);
  const [activeToast, setActiveToast] = useState<GameToastPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current) clearTimeout(timerRef.current);
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

  const isDanger = activeToast.variant === "danger";

  return (
    <Animated.View style={[styles.wrap, { top: 12 + insets.top, opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <View style={[styles.toast, isDanger ? styles.toastDanger : null]}>
        <Ionicons name={isDanger ? "alert-circle-outline" : "checkmark-circle-outline"} size={16} color={isDanger ? colors.danger : colors.secondary} />
        <Text style={styles.text}>{activeToast.text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 30
  },
  toast: {
    maxWidth: "92%",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.35)",
    backgroundColor: "rgba(14,14,16,0.92)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  toastDanger: {
    borderColor: "rgba(255,143,130,0.42)",
    backgroundColor: "rgba(30,13,14,0.94)"
  },
  text: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 12
  }
});
