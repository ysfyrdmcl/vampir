import type { PropsWithChildren } from "react";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import { Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { usePressScale } from "./usePressScale";

interface ReanimatedPressableProps extends PropsWithChildren, Omit<PressableProps, "style" | "children"> {
  contentStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  pressScale?: number;
  style?: StyleProp<ViewStyle>;
}

export function ReanimatedPressable({
  children,
  contentStyle,
  disabled = false,
  onPressIn,
  onPressOut,
  pressScale,
  style,
  ...props
}: ReanimatedPressableProps) {
  const { animatedStyle, pressHandlers } = usePressScale({ disabled, pressedScale: pressScale });

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        pressHandlers.onPressIn();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressHandlers.onPressOut();
        onPressOut?.(event);
      }}
      style={style}
    >
      <Animated.View style={[contentStyle, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
