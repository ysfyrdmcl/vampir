/** Welcome ayrı; CreateRoom yerel nickname + oturum; diğerleri yalnızca bağlantı/oturum. */
const OTHER_OUTER_MENU_ROUTES = new Set(["RoleGuide", "RoleCard"]);

const GAMEPLAY_STACK_ROUTES = new Set(["RoleReveal", "Night", "Vote", "GameLog", "GameSettings"]);

const CONNECTION_CODES = new Set(["SOCKET_CONNECT_ERROR", "BOOTSTRAP_FAILED", "CONNECTION_ERROR"]);

/** Ana menü (Welcome): yalnızca bağlantı / bootstrap. */
export const WELCOME_SOCKET_ERROR_CODES = CONNECTION_CODES;

/**
 * Katıl ekranı: oda girişi + yerel doğrulama kodları + oturum/bağlantı.
 * (Sunucu `GAME_ALREADY_STARTED` katılım reddi için gerekli.)
 */
const JOIN_ROOM_CODES = new Set([
  ...CONNECTION_CODES,
  "ROOM_NOT_FOUND",
  "ROOM_FULL",
  "INVALID_ROOM_CODE",
  "GAME_ALREADY_STARTED",
  "SESSION_TOKEN_MISMATCH",
  "ROOM_CODE_INVALID",
  "NICKNAME_TOO_SHORT"
]);

/** Lobí: hazır / başlat / host / bot — `GAME_ALREADY_STARTED` burada gösterilmez. */
function isLobbyRouteError(code: string): boolean {
  if (CONNECTION_CODES.has(code)) return true;
  if (code === "PLAYERS_NOT_READY" || code === "NOT_ENOUGH_PLAYERS") return true;
  if (code.startsWith("ONLY_HOST_CAN_")) return true;
  if (/^CANNOT_[A-Z0-9_]+_AFTER_START$/.test(code)) return true;
  if (code === "BOT_NOT_FOUND" || code === "INVALID_BOT_COUNT" || code === "TARGET_IS_NOT_BOT") return true;
  if (code === "PLAYER_NOT_FOUND" || code === "SESSION_TOKEN_MISMATCH") return true;
  if (code === "ROOM_NOT_IN_GAME_OVER") return true;
  return false;
}

/**
 * Oyun içi (Durum, Günlük, Ayarlar): aksiyon / faz / duraklatma.
 * GameOver ayrıca `socketErrorAllowedForRoute` içinde daraltılır.
 */
const GAMEPLAY_ROUTE_ALLOWED_CODES = new Set([
  ...CONNECTION_CODES,
  "PLAYER_DEAD",
  "INVALID_PHASE",
  "STALE_ACTION",
  "TARGET_REQUIRED",
  "INVALID_TARGET",
  "TARGET_PROTECTED_BY_GUARD",
  "SOCKET_MISMATCH",
  "PLAYER_NOT_FOUND",
  "GAME_PAUSED",
  "ROLE_NOT_ALLOWED",
  "HUNTER_NOT_TRIGGERED",
  "NO_LYNCH_DISABLED",
  "SELF_PROTECT_BLOCKED",
  "CONSECUTIVE_PROTECT_BLOCKED",
  "DETECTIVE_REPEAT_BLOCKED",
  "ONLY_HOST_CAN_CHANGE_ROOM",
  "ROOM_NOT_IN_GAME_OVER"
]);

const OUTER_AUX_SOCKET_CODES = new Set([...CONNECTION_CODES, "SESSION_TOKEN_MISMATCH"]);

/**
 * Whether a socket error may be written to `errorCode` for this navigation route.
 * Suppressed errors are logged on the socket layer and not stored (avoids stale lobby errors on Welcome).
 */
export function socketErrorAllowedForRoute(code: string, routeName: string | undefined): boolean {
  if (!routeName) return false;

  if (routeName === "Welcome") {
    return WELCOME_SOCKET_ERROR_CODES.has(code);
  }

  if (routeName === "JoinRoom") {
    return JOIN_ROOM_CODES.has(code);
  }

  if (routeName === "Lobby") {
    return isLobbyRouteError(code);
  }

  if (routeName === "GameOver") {
    if (code === "PLAYERS_NOT_READY" || code === "GAME_ALREADY_STARTED") return false;
    return GAMEPLAY_ROUTE_ALLOWED_CODES.has(code);
  }

  if (GAMEPLAY_STACK_ROUTES.has(routeName)) {
    return GAMEPLAY_ROUTE_ALLOWED_CODES.has(code);
  }

  if (routeName === "CreateRoom") {
    return OUTER_AUX_SOCKET_CODES.has(code) || code === "NICKNAME_TOO_SHORT";
  }

  if (OTHER_OUTER_MENU_ROUTES.has(routeName)) {
    return OUTER_AUX_SOCKET_CODES.has(code);
  }

  return false;
}

/** Store’da kalsa bile satır içi / toast öncesi: bu rotada gösterilecek kod mu? */
export function socketErrorVisibleOnRoute(code: string | null, routeName: string | undefined): string | null {
  if (!code) return null;
  return socketErrorAllowedForRoute(code, routeName) ? code : null;
}

/** Inline error on Welcome: yalnızca bağlantı / bootstrap. */
export function socketErrorVisibleForOuterMenu(
  code: string | null,
  options?: { allowNicknameTooShort?: boolean }
): string | null {
  if (!code) return null;
  if (WELCOME_SOCKET_ERROR_CODES.has(code)) return code;
  if (options?.allowNicknameTooShort && code === "NICKNAME_TOO_SHORT") return code;
  return null;
}

export function toFriendlyErrorText(code: string | null): string | null {
  if (!code) return null;

  const table: Record<string, string> = {
    ROOM_NOT_FOUND: "Oda bulunamadı. Kod yanlış olabilir veya oda kapanmış olabilir.",
    ROOM_FULL: "Oda dolu.",
    GAME_ALREADY_STARTED: "Oyun başlamış. Aynı cihazla yeniden bağlanmayı deneyin.",
    NICKNAME_TOO_SHORT: "Oyuncu adı en az 2 karakter olmalı.",
    ROOM_CODE_INVALID: "Oda kodu 6 karakter olmalı.",
    INVALID_ROOM_CODE: "Oda kodu geçersiz.",
    SOCKET_CONNECT_ERROR: "Sunucuya ulaşılamıyor. Bağlantını kontrol et.",
    CONNECTION_ERROR: "Sunucu bağlantısında sorun oluştu.",
    BOOTSTRAP_FAILED: "Uygulama başlatılırken bir hata oluştu.",
    PLAYER_NOT_FOUND: "Oyuncu bulunamadı.",
    PLAYER_DEAD: "Elendin. Bu fazda aksiyon yapamazsın.",
    INVALID_PHASE: "Bu aksiyon şu an yapılamaz.",
    STALE_ACTION: "Süre doldu veya faz değişti. Tekrar dene.",
    TARGET_REQUIRED: "Hedef seçmelisin.",
    INVALID_TARGET: "Bu hedef seçilemez.",
    TARGET_PROTECTED_BY_GUARD: "Bu oyuncu bugün Gardiyan korumasında, hedeflenemez.",
    ONLY_HOST_CAN_ADD_BOT: "Sadece host bot ekleyebilir.",
    ONLY_HOST_CAN_REMOVE_BOT: "Sadece host bot çıkarabilir.",
    ONLY_HOST_CAN_CHANGE_BOT: "Sadece host bot ayarını değiştirebilir.",
    CANNOT_ADD_BOT_AFTER_START: "Oyun başladıktan sonra bot eklenemez.",
    CANNOT_REMOVE_BOT_AFTER_START: "Oyun başladıktan sonra bot çıkarılamaz.",
    CANNOT_CHANGE_BOT_AFTER_START: "Oyun başladıktan sonra bot ayarı değişemez.",
    INVALID_BOT_COUNT: "Geçersiz bot sayısı.",
    BOT_NOT_FOUND: "Bot bulunamadı.",
    TARGET_IS_NOT_BOT: "Bu oyuncu bot değil.",
    ROOM_NOT_IN_GAME_OVER: "Bu işlem sadece oyun bittikten sonra yapılabilir.",
    PLAYERS_NOT_READY: "Hazır olmayan oyuncular var. Herkes hazır olmalı.",
    NOT_ENOUGH_PLAYERS: "Oyuncu sayısı yetersiz.",
    GAME_PAUSED: "Oyun duraklatıldı; bu aksiyon şu an alınamaz.",
    ROLE_NOT_ALLOWED: "Bu rol bu aksiyonu yapamaz.",
    HUNTER_NOT_TRIGGERED: "Avcı yetkisi bu tur için geçerli değil.",
    NO_LYNCH_DISABLED: "Çekimser oy bu odada kapalı.",
    SELF_PROTECT_BLOCKED: "Bu tur kendini koruyamazsın.",
    CONSECUTIVE_PROTECT_BLOCKED: "Üst üste aynı oyuncuyu koruyamazsın.",
    DETECTIVE_REPEAT_BLOCKED: "Aynı oyuncuyu tekrar araştıramazsın."
  };

  return table[code] ?? `Bir hata oluştu: ${code}`;
}

export function toFriendlyToastText(code: string | null): string | null {
  if (!code) return null;
  /** Katıl / Welcome satır içi metin; ScreenShell ile çift toast olmasın. */
  if (code === "ROOM_NOT_FOUND") return null;

  const table: Record<string, string> = {
    ROOM_FULL: "Oda dolu",
    GAME_ALREADY_STARTED: "Oyun başlamış",
    NICKNAME_TOO_SHORT: "Oyuncu adını kontrol et",
    ROOM_CODE_INVALID: "Oda kodu geçersiz",
    INVALID_ROOM_CODE: "Oda kodu geçersiz",
    SOCKET_CONNECT_ERROR: "Sunucuya ulaşılamıyor",
    CONNECTION_ERROR: "Bağlantı sorunu",
    BOOTSTRAP_FAILED: "Başlatma hatası",
    PLAYER_NOT_FOUND: "Oyuncu bulunamadı",
    PLAYER_DEAD: "Elendin, aksiyon alamazsın",
    INVALID_PHASE: "Bu fazda yapılamaz",
    STALE_ACTION: "Faz değişti, tekrar dene",
    TARGET_REQUIRED: "Hedef seçmelisin",
    INVALID_TARGET: "Bu hedef seçilemez",
    TARGET_PROTECTED_BY_GUARD: "Hedef koruma altında",
    PLAYERS_NOT_READY: "Herkes hazır değil",
    NOT_ENOUGH_PLAYERS: "Oyuncu sayısı yetersiz",
    ROOM_NOT_IN_GAME_OVER: "Şu an lobiye dönülemez",
    GAME_PAUSED: "Oyun duraklatıldı",
    ROLE_NOT_ALLOWED: "Bu aksiyon rolüne kapalı",
    HUNTER_NOT_TRIGGERED: "Avcı yetkisi yok",
    NO_LYNCH_DISABLED: "Çekimser kapalı",
    SELF_PROTECT_BLOCKED: "Kendini koruma kapalı",
    CONSECUTIVE_PROTECT_BLOCKED: "Üst üste aynı koruma yok",
    DETECTIVE_REPEAT_BLOCKED: "Tekrar araştırma yok"
  };

  return table[code] ?? "Bir hata oluştu";
}

export function toConnectionText(status: "idle" | "connecting" | "connected" | "error"): string {
  if (status === "connected") return "Sunucuya bağlı";
  if (status === "connecting") return "Bağlanıyor";
  if (status === "error") return "Bağlantı sorunu";
  return "Hazırlanıyor";
}
