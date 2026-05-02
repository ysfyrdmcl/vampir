import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { emitLeaveRoom } from "../socket/runtime";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "GameSettings">;

export function GameSettingsScreen({ navigation }: Props) {
  return (
    <ScreenShell scene="result" headerTitle="AYARLAR">
      <View style={styles.root}>
        <Text style={styles.title}>Oyun Ayarları</Text>
        <Text style={styles.subtitle}>Bu fazda sadece güvenli çıkış seçeneği aktif.</Text>
        <PrimaryButton
          label="Odadan Ayrıl"
          iconName="exit-outline"
          variant="charcoal"
          onPress={() => {
            emitLeaveRoom();
            navigation.navigate("Welcome");
          }}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 12,
    justifyContent: "center"
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 32,
    textAlign: "center"
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.sansMedium,
    marginBottom: spacing.sm
  }
});
