import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentProps } from "react";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "blood"
  | "charcoal"
  | "outline"
  | "gold"
  | "danger"
  | "ghost"
  | "parchment"
  | "locked";
type ButtonSize = "regular" | "compact";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  iconName?: ComponentProps<typeof Ionicons>["name"];
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function PrimaryButton({ label, onPress, disabled = false, iconName, variant = "primary", size = "regular", style, compact = false }: PrimaryButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const config = uiStandard.buttonVariants[variant];
  const isLocked = variant === "locked";
  const isDisabled = disabled || isLocked;
  const isCompact = compact || size === "compact";

  const onPressIn = () => {
    if (isDisabled) return;
    Animated.spring(scale, {
      toValue: uiStandard.motion.buttonPressScale,
      speed: uiStandard.motion.buttonPressInSpeed,
      bounciness: 4,
      useNativeDriver: true
    }).start();
    Animated.timing(glow, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true
    }).start();
  };

  const onPressOut = () => {
    if (isDisabled) return;
    Animated.spring(scale, {
      toValue: 1,
      speed: uiStandard.motion.buttonPressOutSpeed,
      bounciness: 5,
      useNativeDriver: true
    }).start();
    Animated.timing(glow, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true
    }).start();
  };

  return (
    <Pressable onPress={onPress} disabled={isDisabled} onPressIn={onPressIn} onPressOut={onPressOut} style={[style, isDisabled ? styles.disabled : null]}>
      <Animated.View
        style={[
          styles.base,
          isCompact ? styles.baseCompact : null,
          variant === "destructive" || variant === "danger" ? styles.baseDestructive : null,
          variant === "ghost" ? styles.baseGhost : null,
          {
            borderColor: config.border,
            transform: [{ scale }],
            shadowOpacity: glow.interpolate({
              inputRange: [0, 1],
              outputRange: [uiStandard.button.shadowOpacity * 0.66, uiStandard.button.shadowOpacity]
            })
          }
        ]}
      >
        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          {iconName ? <Ionicons name={iconName} size={isCompact ? uiStandard.button.compactIconSize : uiStandard.button.iconSize} color={config.text} /> : null}
          <Text style={[styles.label, isCompact ? styles.labelCompact : null, { color: config.text }]}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: uiStandard.button.height,
    borderRadius: uiStandard.button.radius,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: uiStandard.buttonVariants.blood.border,
    shadowColor: "#000",
    shadowOpacity: uiStandard.button.shadowOpacity * 0.66,
    shadowRadius: uiStandard.button.shadowRadius,
    shadowOffset: { width: 0, height: uiStandard.button.shadowOffsetY },
    elevation: 4
  },
  baseCompact: {
    height: uiStandard.button.compactHeight,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  baseDestructive: {
    shadowOpacity: 0.2,
    shadowRadius: 10
  },
  baseGhost: {
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1
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
    fontSize: uiStandard.button.labelSize,
    fontFamily: typography.serif,
    letterSpacing: 0.2
  },
  labelCompact: {
    fontSize: uiStandard.button.compactLabelSize,
    fontFamily: typography.sansBold,
    letterSpacing: 0.4
  },
  disabled: {
    opacity: 0.45
  }
});
