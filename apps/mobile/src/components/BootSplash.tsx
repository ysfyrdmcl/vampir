import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { ScreenShell } from "./ScreenShell";

export function BootSplash() {
  const progress = useRef(new Animated.Value(0.08)).current;
  const shieldScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loading = Animated.timing(progress, {
      toValue: 0.72,
      duration: 1300,
      useNativeDriver: false
    });
    loading.start();
  }, [progress]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(shieldScale, {
          toValue: 1.08,
          duration: 700,
          useNativeDriver: true
        }),
        Animated.timing(shieldScale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true
        })
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [shieldScale]);

  return (
    <ScreenShell scene="splash" showTopBar={false} showBottomNav={false}>
      <View style={styles.root}>
        <Animated.View style={[styles.badge, { transform: [{ scale: shieldScale }] }]}>
          <Ionicons name="shield-outline" size={52} color={colors.primaryBright} />
        </Animated.View>
        <Text style={styles.title}>VAMPİR KÖYLÜ</Text>
        <Text style={styles.subtitle}>KARANLIK ÇÖKÜYOR</Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }) }]} />
        </View>
        <Text style={styles.caption}>Köy halkı uyanıyor...</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16
  },
  badge: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,14,18,0.75)",
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.25)"
  },
  title: {
    color: colors.secondary,
    fontFamily: typography.serif,
    fontSize: 52,
    textAlign: "center"
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 19,
    letterSpacing: 2
  },
  track: {
    marginTop: 8,
    width: 260,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(170,137,132,0.4)"
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primaryBright
  },
  caption: {
    color: colors.textDim,
    fontFamily: typography.sans,
    fontSize: 16
  }
});
