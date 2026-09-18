import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  deviceId: "@vk/device-id",
  sessionToken: "@vk/session-token",
  roomCode: "@vk/room-code",
  nickname: "@vk/nickname"
} as const;

export async function loadDeviceId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.deviceId);
}

export async function saveDeviceId(deviceId: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.deviceId, deviceId);
}

export async function loadSessionToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.sessionToken);
}

export async function saveRoomSession(roomCode: string, token: string): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.sessionToken, token],
    [KEYS.roomCode, roomCode],
    [`@vk/room-token/${roomCode}`, token]
  ]);
}

export async function loadRoomToken(roomCode: string): Promise<string | null> {
  return AsyncStorage.getItem(`@vk/room-token/${roomCode}`);
}

export async function loadLastRoomCode(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.roomCode);
}

export async function clearRoomSession(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.sessionToken, KEYS.roomCode]);
}

export async function saveNickname(nickname: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.nickname, nickname);
}

export async function loadNickname(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.nickname);
}

