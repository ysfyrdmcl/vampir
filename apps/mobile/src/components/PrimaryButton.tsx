import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentProps } from "react";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type ButtonVariant = "blood" | "charcoal" | "outline";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  iconName?: ComponentProps<typeof Ionicons>["name"];
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
}

function gradientForVariant(variant: ButtonVariant): readonly [string, string] {
  if (variant === "charcoal") {
    return ["#3a3939", "#2a2a2a"] as const;
  }
  if (variant === "outline") {
    return ["rgba(13,13,13,0.86)", "rgba(13,13,13,0.86)"] as const;
  }
  return ["#b52619", "#8b0000"] as const;
}

export function PrimaryButton({ label, onPress, disabled = false, iconName, variant = "blood", style }: PrimaryButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      speed: 30,
      bounciness: 4,
      useNativeDriver: true
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      speed: 26,
      bounciness: 5,
      useNativeDriver: true
    }).start();
  };

  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={onPressIn} onPressOut={onPressOut} style={[style, disabled ? styles.disabled : null]}>
      <Animated.View style={[styles.base, variant === "outline" ? styles.outline : null, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={gradientForVariant(variant)}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          {iconName ? <Ionicons name={iconName} size={24} color={colors.text} /> : null}
          <Text style={[styles.label, variant === "charcoal" ? styles.charcoalLabel : null]}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 66,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.28)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  outline: {
    borderColor: "rgba(170,137,132,0.45)"
  },
  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12
  },
  label: {
    color: colors.text,
    fontSize: 22,
    fontFamily: typography.serif,
    letterSpacing: 0.2
  },
  charcoalLabel: {
    color: "#dfdfdf"
  },
  disabled: {
    opacity: 0.45
  }
});
