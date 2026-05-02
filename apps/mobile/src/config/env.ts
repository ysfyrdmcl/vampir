import { NativeModules } from "react-native";

function resolveSocketUrl(): string {
  const explicitUrl = process.env.EXPO_PUBLIC_SOCKET_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    // Expo dev runtime often provides exp://<host>:<port>/... instead of http://...
    const matchedHost = scriptURL.match(/(?:exp|http|https|ws|wss):\/\/([^/:]+)/i)?.[1];
    if (matchedHost && matchedHost !== "localhost" && matchedHost !== "127.0.0.1") {
      return `http://${matchedHost}:3000`;
    }
  }

  return "http://127.0.0.1:3000";
}

export const runtimeEnv = {
  socketUrl: resolveSocketUrl(),
  socketPath: process.env.EXPO_PUBLIC_SOCKET_PATH ?? "/socket.io",
  clientLogUrl: process.env.EXPO_PUBLIC_CLIENT_LOG_URL?.trim() || `${resolveSocketUrl()}/client-logs`
} as const;
