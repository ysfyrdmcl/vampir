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
    TARGET_PROTECTED_BY_GUARD: "Bu oyuncu bugün Gardiyan korumasında, hedeflenemez."
  };

  return table[code] ?? `Bir hata oluştu: ${code}`;
}

export function toFriendlyToastText(code: string | null): string | null {
  if (!code) return null;

  const table: Record<string, string> = {
    ROOM_NOT_FOUND: "Oda bulunamadı",
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
    TARGET_PROTECTED_BY_GUARD: "Hedef koruma altında"
  };

  return table[code] ?? "Bir hata oluştu";
}

export function toConnectionText(status: "idle" | "connecting" | "connected" | "error"): string {
  if (status === "connected") return "Sunucuya bağlı";
  if (status === "connecting") return "Bağlanıyor";
  if (status === "error") return "Bağlantı sorunu";
  return "Hazırlanıyor";
}
