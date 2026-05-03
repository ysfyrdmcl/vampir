import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "QrScanner">;

export function QrScannerScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLocked, setIsLocked] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (isLocked) return;
    const roomCode = extractRoomCode(result.data);
    if (!roomCode) {
      setErrorText("Bu QR kodunda geçerli oda kodu bulunamadı.");
      return;
    }
    setIsLocked(true);
    navigation.navigate("JoinRoom", { scannedCode: roomCode });
  };

  if (!permission) {
    return (
      <ScreenShell scene="join" headerTitle="QR TARA">
        <View style={styles.centerPanel}>
          <Text style={styles.title}>Kamera hazırlanıyor...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenShell scene="join" headerTitle="QR TARA">
        <View style={styles.centerPanel}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={30} color={colors.secondary} />
          </View>
          <Text style={styles.title}>Kamera izni gerekiyor</Text>
          <Text style={styles.copy}>Oda QR kodunu okuyup kod alanına yerleştirmek için kamerayı açmalıyız.</Text>
          <PrimaryButton label="Kameraya İzin Ver" iconName="scan-outline" onPress={requestPermission} />
          <PrimaryButton label="Geri Dön" iconName="arrow-back-outline" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell scene="join" headerTitle="QR TARA">
      <View style={styles.scannerShell}>
        <View style={styles.cameraFrame}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={isLocked ? undefined : handleBarcodeScanned}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.scanBox}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>
        </View>
        <Text style={styles.helper}>Oda QR kodunu çerçevenin içine getir.</Text>
        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        <Pressable style={styles.manualButton} onPress={() => navigation.goBack()}>
          <Ionicons name="keypad-outline" size={18} color={colors.secondary} />
          <Text style={styles.manualText}>Kodu elle gir</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

function extractRoomCode(value: string): string | null {
  const upperValue = value.toUpperCase();
  const urlMatch = upperValue.match(/[?&#](?:ROOM|ROOMCODE|ROOM_CODE|CODE)=([A-Z0-9]{4,6})/);
  if (urlMatch) return urlMatch[1];
  const pathMatch = upperValue.match(/(?:JOIN|ROOM|ODA)[/:=-]([A-Z0-9]{4,6})/);
  if (pathMatch) return pathMatch[1];
  const directMatch = upperValue.match(/\b[A-Z0-9]{4,6}\b/);
  return directMatch?.[0] ?? null;
}

const styles = StyleSheet.create({
  centerPanel: {
    flex: 1,
    justifyContent: "center",
    gap: 14,
    paddingBottom: spacing.xxl
  },
  permissionIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.35)",
    backgroundColor: "rgba(36,31,20,0.7)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center"
  },
  title: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 24,
    textAlign: "center"
  },
  copy: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  scannerShell: {
    flex: 1,
    gap: 14,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl
  },
  cameraFrame: {
    flex: 1,
    minHeight: 420,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.28)",
    backgroundColor: colors.backgroundDeep
  },
  camera: {
    flex: 1
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.16)"
  },
  scanBox: {
    width: 230,
    height: 230
  },
  corner: {
    position: "absolute",
    width: 44,
    height: 44,
    borderColor: colors.secondary
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3
  },
  cornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3
  },
  helper: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    textAlign: "center"
  },
  error: {
    color: colors.danger,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    textAlign: "center"
  },
  manualButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.32)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(12,12,14,0.72)"
  },
  manualText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 12
  }
});
