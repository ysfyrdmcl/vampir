import { StyleSheet, Text, View } from "react-native";
import { BrandIntroAnimation } from "../animations";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";

interface HeroBrandAreaProps {
  title: string;
  subtitle: string;
}

export function HeroBrandArea({ title, subtitle }: HeroBrandAreaProps) {
  return (
    <View style={styles.wrap}>
      <BrandIntroAnimation />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 7,
    minHeight: 162,
    justifyContent: "flex-end"
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: uiStandard.text.heroTitleSize - 6,
    textAlign: "center"
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: uiStandard.text.heroSubtitleSize - 2,
    textAlign: "center"
  }
});
