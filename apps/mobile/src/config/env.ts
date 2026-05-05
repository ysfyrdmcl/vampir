import Constants from "expo-constants";
import { NativeModules } from "react-native";

function hostFromUrl(value: string | null | undefined): string | null {
  const matchedHost = value?.match(/(?:exp|http|https|ws|wss):\/\/([^/:]+)/i)?.[1];
  if (!matchedHost || matchedHost === "localhost" || matchedHost === "127.0.0.1") {
    return null;
  }
  return matchedHost;
}

function resolveSocketUrl(): string {
  const explicitUrl = process.env.EXPO_PUBLIC_SOCKET_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  const expoHost = hostFromUrl(hostUri ? `exp://${hostUri}` : null);
  if (expoHost) {
    return `http://${expoHost}:3000`;
  }

  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  const scriptHost = hostFromUrl(scriptURL);
  if (scriptHost) {
    return `http://${scriptHost}:3000`;
  }

  return "http://127.0.0.1:3000";
}

export const runtimeEnv = {
  socketUrl: resolveSocketUrl(),
  socketPath: process.env.EXPO_PUBLIC_SOCKET_PATH ?? "/socket.io",
  clientLogUrl: process.env.EXPO_PUBLIC_CLIENT_LOG_URL?.trim() || `${resolveSocketUrl()}/client-logs`
} as const;
