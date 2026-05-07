import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { KineticGlassButton, type KineticButtonVariant } from "./KineticGlassButton";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "blood"
  | "charcoal"
  | "outline"
  | "gold"
  | "danger"
  | "danger-outline"
  | "dangerOutline"
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
  const isLocked = variant === "locked";
  const isDisabled = disabled || isLocked;
  const variantKey = variant === "danger-outline" ? "dangerOutline" : variant;
  const isCompact = compact || size === "compact";
  const kineticVariant = toKineticVariant(variantKey, isDisabled);

  return (
    <KineticGlassButton
      label={label}
      onPress={onPress}
      disabled={isDisabled}
      iconName={iconName}
      variant={kineticVariant}
      compact={isCompact}
      style={style}
    />
  );
}

function toKineticVariant(variant: string, disabled: boolean): KineticButtonVariant {
  if (disabled) return "locked";
  if (variant === "gold" || variant === "parchment") return "gold";
  if (variant === "danger" || variant === "destructive") return "danger";
  if (variant === "dangerOutline") return "danger-outline";
  if (variant === "ghost") return "ghost";
  if (variant === "secondary" || variant === "charcoal" || variant === "outline") return "secondary";
  return "primary";
}
