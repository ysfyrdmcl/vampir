import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

interface GameToastProps {
  message: string | null;
}

function isToastMessage(message: string | null): boolean {
  if (!message) return false;
  return message.toLowerCase().includes("kopyaland");
}

export function GameToast({ message }: GameToastProps) {
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (!isToastMessage(message)) return;
    setActiveMessage(message);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true })
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -10, duration: 220, useNativeDriver: true })
        ]).start(() => setActiveMessage(null));
      }, 1500);
    });
  }, [message, opacity, translateY]);

  if (!activeMessage) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <View style={styles.toast}>
        <Ionicons name="checkmark-circle-outline" size={16} color={colors.secondary} />
        <Text style={styles.text}>{activeMessage}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 14,
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
  text: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 12
  }
});
