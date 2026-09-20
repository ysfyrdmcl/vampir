const isProductionProfile = process.env.EAS_BUILD_PROFILE === "production" || process.env.APP_ENV === "production";
const isPreviewProfile = process.env.EAS_BUILD_PROFILE === "preview" || process.env.APP_ENV === "preview";

function requireForProduction(name, fallback) {
  const value = process.env[name] || fallback;
  if (isProductionProfile && !value) {
    throw new Error(`${name} is required for production builds.`);
  }
  return value;
}

const bundleIdentifier = requireForProduction("IOS_BUNDLE_IDENTIFIER", "com.vampirkoylu.game");
const androidPackage = requireForProduction("ANDROID_PACKAGE", "com.vampirkoylu.game");
const easProjectId = requireForProduction("EAS_PROJECT_ID");
const socketUrl = requireForProduction("EXPO_PUBLIC_SOCKET_URL");
if (isPreviewProfile && !socketUrl?.trim()) {
  throw new Error("EXPO_PUBLIC_SOCKET_URL is required for preview builds.");
}

let socketAddress;
if (socketUrl) {
  socketAddress = new URL(socketUrl);
  if (!["http:", "https:", "ws:", "wss:"].includes(socketAddress.protocol)) {
    throw new Error("EXPO_PUBLIC_SOCKET_URL must be an HTTP(S) or WS(S) URL.");
  }
  if (isProductionProfile && !["https:", "wss:"].includes(socketAddress.protocol)) {
    throw new Error("EXPO_PUBLIC_SOCKET_URL must use https:// or wss:// for production builds.");
  }
}
const allowLocalHttp = !isProductionProfile && ["http:", "ws:"].includes(socketAddress?.protocol);
const androidVersionCode = Number(process.env.ANDROID_VERSION_CODE || 1);
if (!Number.isInteger(androidVersionCode) || androidVersionCode < 1) throw new Error("ANDROID_VERSION_CODE must be a positive integer.");

module.exports = {
  expo: {
    name: "Vampir Koylu",
    slug: "vampir-koylu",
    version: "0.1.0",
    orientation: "portrait",
    platforms: ["ios", "android"],
    scheme: "vampirkoylu",
    icon: "./src/assets/app/icon.png",
    userInterfaceStyle: "dark",
    plugins: [
      ["expo-build-properties", { android: { usesCleartextTraffic: allowLocalHttp } }],
      "expo-font",
      "expo-status-bar"
    ],
    splash: {
      image: "./src/assets/cards/card_back_default.png",
      resizeMode: "contain",
      backgroundColor: "#131313"
    },
    ios: {
      bundleIdentifier,
      buildNumber: process.env.IOS_BUILD_NUMBER || "1",
      supportsTablet: false,
      infoPlist: {
        NSLocalNetworkUsageDescription: "Aynı Wi-Fi ağındaki oyun sunucusuna bağlanmak için kullanılır.",
        NSAppTransportSecurity: { NSAllowsArbitraryLoads: allowLocalHttp }
      }
    },
    android: {
      package: androidPackage,
      allowBackup: false,
      versionCode: androidVersionCode,
      adaptiveIcon: {
        foregroundImage: "./src/assets/app/adaptive-icon.png",
        backgroundColor: "#131313"
      },
      permissions: []
    },
    assetBundlePatterns: [
      "src/assets/backgrounds/*",
      "src/assets/cards/*",
      "src/assets/role-reveal/*",
      "src/assets/roles/*",
      "src/assets/svg/**/*",
      "src/assets/textures/*"
    ],
    extra: {
      appEnv: process.env.APP_ENV || "development",
      eas: easProjectId ? { projectId: easProjectId } : undefined
    }
  }
};
