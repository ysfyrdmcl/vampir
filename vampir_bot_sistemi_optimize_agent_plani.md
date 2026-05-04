# Vampir Köylü — Bot Sistemi İçin Token Optimize Agent Planı

Bu dosya, önceki uzun faz dokümanının daha küçük, uygulanabilir ve Codex/Cursor tarafından daha az token tüketerek takip edilecek sürümüdür.

Ana hedef:

```text
Canlı oyuna server-authoritative bot sistemi eklemek.
Botlar gerçek room player olacak.
Botlar rol alacak.
Botlar legal aksiyon üretecek.
Botlar gündüz kısa template konuşmaları gösterecek.
Bot zekâsı LLM/API değil, algoritmik skor + template sistemi olacak.
```

---

## 1. Agent İçin Sert Kurallar

Bu kurallar fazların tamamı için geçerlidir.

```text
Mobile oyun kuralı hesaplamaz.
Mobile bot üretmez.
Mobile bot hedefi seçmez.
Mobile bot konuşması üretmez.
Server oyun motoru ve socket eventleri karar vericidir.
Bot action validator bypass etmez.
Bot doğrudan game state mutate etmez.
Bot doğrudan oyuncu öldürmez.
Bot normal player action submission yolunu kullanır.
LLM/API kullanılmaz.
Dış servis kullanılmaz.
Global chat eklenmez.
Sesli konuşma eklenmez.
Bot insan gibi gizlenmez.
BOT rozeti kaldırılmaz.
Oyun başladıktan sonra bot ekleme/çıkarma/zekâ değiştirme yapılmaz.
Hard max oyuncu limiti koyulmaz.
```

---

## 2. Neden Önceki Plan Çok Token Yedi?

### 2.1 Aynı faz numaraları farklı anlamlara geldi

Önceki dosyalarda `Faz 7`, `Faz 8`, `Faz 9` farklı bağlamlarda kullanıldı.

Örnek çakışma:

```text
Bot sistemi dokümanı:
Faz 7 = Server Bot Action Engine
Faz 8 = Bot Zekâ Davranışları
Faz 9 = Bot Memory Sistemi

Mobil uygulama planı:
Faz 7 = UI/animasyon cilası
Faz 8 = stabilizasyon/test/loglama
Faz 9 = release/store hazırlıkları
```

Sonuç:

```text
Agent “Faz 7-9” denildiğinde hangi planın fazlarını uygulayacağını karıştırdı.
Bot action engine yerine mobil UI cilası ve server stabilizasyonuna kaydı.
```

### 2.2 Tek dosyada 21 faz vardı

21 faz aynı prompt içinde verilince agent her adımda çok fazla bağlam taşımaya başladı.

Sorun:

```text
Bot lifecycle
Bot action engine
Bot intelligence
Memory
Speech event
Speech UI
Settings
Loglama
Testler
Kabul kriterleri
Yapılmayacaklar
Release/store gibi agent dışı işler
```

Bunların hepsi tek dokümanda olunca agent gereksiz dosya okudu, gereksiz açıklama üretti ve scope’u küçültmek için tekrar tekrar soru sordu.

### 2.3 Yapılamayacak işler fazların içinde duruyordu

Store yayını, gerçek icon/splash üretimi, TestFlight/Internal Test yüklemesi, developer hesapları, privacy policy onayı gibi işler agent’ın doğrudan yapacağı kod fazlarının içine girmemeli.

Bunlar ayrı `Backlog / Manuel İşler` bölümünde kalmalı.

### 2.4 “Uygulamaya başla” komutu fazla genişti

Geniş prompt agent’ı şu döngüye soktu:

```text
Tüm dokümanı oku.
Repo yapısını tekrar tara.
Büyük plan çıkar.
Varsayım yap.
Scope küçültmek için soru sor.
Bir kısmı uygula.
Sonra tekrar yeni faz için aynı bağlamı taşı.
```

Doğru yöntem:

```text
Her yeni chat = tek teknik faz.
Her faz = sınırlı dosya listesi.
Her faz = net kabul kriteri.
Her faz sonunda dur.
```

---

## 3. Yeni Faz İsimlendirme Standardı

Artık fazlar sadece numara ile çağrılmayacak. Her fazın kısa kodu olacak.

```text
BOT-A = Lobby ve temel bot player altyapısı
BOT-B = Bot Action Engine
BOT-C = Bot Intelligence + Targeting
BOT-D = Bot Memory MVP
BOT-E = Server Bot Speech Event + Template Engine
BOT-F = Mobile Bot Speech Overlay
BOT-G = Bot testleri, invariantlar ve loglama
BOT-H = Final polish ve manuel test matrisi
```

Böylece “Faz 7” gibi belirsiz komutlar kullanılmayacak.

---

## 4. Mevcut Durumdan Devam Kuralı

Agent yeni chate başladığında önce bunu varsayacak:

```text
BOT-A büyük ölçüde uygulanmış olabilir.
```

Ama yeniden yazmayacak. Önce doğrulayacak.

### 4.1 BOT-A doğrulama checklist

Sadece kontrol et, bozuk değilse dokunma:

```text
Shared BotIntelligence var mı?
Shared BotPersonality var mı?
RoomPlayerView içinde isBot / botIntelligence / botPersonality var mı?
room:bot:add event var mı?
room:bot:remove event var mı?
room:bot:set-intelligence event var mı?
room:bot:fill-minimum event var mı?
RoomManager bot ekliyor mu?
Botlar isReady=true mi?
Botlar snapshot’a giriyor mu?
BotControlCard var mı?
PlayerRosterCard BOT rozeti gösteriyor mu?
Oyun başladıktan sonra bot yönetimi kapalı mı?
Hard max oyuncu limiti engel olmuyor mu?
```

BOT-A eksiksizse:

```text
BOT-A'yı tekrar implement etme.
Sadece eksik küçük nokta varsa patchle.
Asıl faza geç.
```

---

## 5. Token Optimize Çalışma Protokolü

Her agent oturumunun başına aşağıdaki blok konulmalı.

```text
Bu oturumda sadece belirtilen BOT fazını uygula.
Önce git status al.
Sonra sadece fazın dosya listesini oku.
Repo genelinde büyük arama yapma; gerekiyorsa rg ile hedefli ara.
Mevcut çalışan kodu refactor etme.
Uygulanmış işi tekrar yazma.
Yeni framework/library ekleme.
LLM/API/dış servis ekleme.
Faz dışı UI polish yapma.
Faz dışı release/store işi yapma.
Her değişiklikten sonra TypeScript/test kontrolü çalıştır.
Sonda sadece değişen dosyaları, test sonucunu ve sonraki fazı yaz.
Uzun açıklama ve gereksiz diff dökümü üretme.
```

### 5.1 Dosya okuma limiti

```text
İlk geçişte maksimum 8 dosya oku.
Ek dosya gerekiyorsa nedenini tek cümleyle belirt.
Bütün projeyi tarama.
Bütün eski md dosyalarını tekrar tekrar okuma.
```

### 5.2 Cevap formatı

Agent final cevabı şu formatta olmalı:

```text
## Yapıldı
- ...

## Değişen dosyalar
- ...

## Doğrulama
- komut: sonuç

## Faz dışı bırakılanlar
- ...

## Sonraki net faz
BOT-X: ...
```

---

## 6. Uygulanmayacak / Manuel Backlog

Bunlar kod fazlarının içine alınmayacak.

```text
Gerçek app icon PNG üretimi
Gerçek splash PNG üretimi
Apple Developer hesabı işlemleri
Google Play Console işlemleri
EAS hesabı login / sertifika onayları
TestFlight yükleme
Internal Test yükleme
Store görselleri
Store açıklamasının nihai onayı
Privacy policy hukuki nihai onayı
Gerçek cihaz crash raporlarının manuel incelenmesi
```

Agent sadece iskelet/taslak hazırlayabilir. Bunlar bot sistemi fazlarını bloke etmez.

---

# BOT-A — Lobby ve Temel Bot Player Altyapısı

## Durum

Bu faz daha önce uygulanmış olabilir. Önce doğrula.

## Amaç

Host lobide bot ekleyebilsin, çıkarabilsin, zekâ seçebilsin. Botlar server snapshot’ında gerçek oyuncu gibi görünsün.

## Okunacak dosyalar

```text
packages/shared/src/game-types.ts
packages/shared/src/socket-events.ts
packages/shared/src/index.ts
apps/server/src/rooms/room-manager.ts
apps/server/src/socket/socket-runtime.ts
apps/server/src/socket/socket-schema.ts
apps/mobile/src/store/game-store.ts
apps/mobile/src/screens/LobbyScreen.tsx
apps/mobile/src/components/PlayerRosterCard.tsx
apps/mobile/src/ui/error-text.ts
```

## Yapılacaklar

```text
BotIntelligence = random | balanced | deceptive
BotPersonality = quiet | defensive | accuser | analyst | chaotic | leader
RoomPlayerView bot alanları
Bot socket eventleri
RoomManager add/remove/fill/change intelligence
Bot name pool
Bot ready=true
Bot connected=true veya bot özel bağlantı modeli
Botlar minimum oyuncu sayısına dahil
Host-only bot controls
BOT rozeti
Hard max yok
Soft warning opsiyonel
```

## Kabul kriterleri

```text
Host + Bot Ekle ile bot ekler.
Host Minimuma Tamamla ile 4 oyuncuya tamamlar.
Bot roster’da BOT rozetiyle görünür.
Bot hazır görünür.
Non-host bot ekleyemez.
Oyun başladıktan sonra bot değiştirilemez.
TypeScript temizdir.
```

---

# BOT-B — Bot Action Engine

## Amaç

Botlar oyun fazlarında otomatik ve legal aksiyon submit eder.

Bu fazın hedefi konuşma değil, mekanik aksiyondur.

## Okunacak dosyalar

```text
apps/server/src/socket/socket-runtime.ts
apps/server/src/rooms/room-manager.ts
apps/server/src/game/game-types.ts
apps/server/src/game/*action*.ts
apps/server/src/game/*resolver*.ts
apps/server/src/game/*phase*.ts
apps/server/src/game/*engine*.ts
packages/shared/src/game-types.ts
packages/shared/src/socket-events.ts
```

Gerçek dosya isimleri farklıysa `rg "submitAction|action|phase|VampireVote|DayVote" apps/server/src` ile hedefli ara.

## Yeni dosyalar

```text
apps/server/src/bots/bot-types.ts
apps/server/src/bots/bot-action-engine.ts
apps/server/src/bots/bot-targeting.ts
apps/server/src/bots/bot-memory.ts
```

## Temel tasarım

```text
BotActionEngine faz değişimini izler.
Aktif faz bot aksiyonu gerektiriyorsa botlar için timer kurar.
Timer phaseId + roomCode + botPlayerId ile takip edilir.
Aynı bot aynı phaseId içinde ikinci kez submit etmez.
Faz değişirse eski timer iptal edilir.
Room kapanırsa timer temizlenir.
GameOver olursa timer temizlenir.
Bot çıkarılırsa ilgili timer temizlenir.
```

## Aksiyon üretilecek MVP fazları

Önce sadece bunları uygula:

```text
VampireVote
DetectiveInspect
DoctorProtect
DayVote
```

Sonra rol mevcutsa ekle:

```text
GuardProtect
MayorElection
HunterLastBreath
```

Bir rol/faz repo’da yoksa uydurma. `TODO` yaz ve geç.

## Submit kuralı

```text
Bot hedef seçer.
Bot action normal submit path’e gider.
Aynı validator çalışır.
Invalid ise loglanır.
Mümkünse bir kez alternatif legal target denenir.
Yine invalid ise skip edilir.
```

Yasak:

```text
gameState.players[target].isAlive = false gibi direkt mutation yok.
resolver içine özel bot bypass yok.
validator bypass yok.
```

## Gecikme

```text
DEV delay: 300-800ms
PROD delay: 1000-3000ms
```

İlk implementasyonda sabit config yeterli.

## Kabul kriterleri

```text
2 insan + 2 bot oyunda gece fazı bot yüzünden kilitlenmez.
Vampire bot legal hedefe saldırı oyu submit eder.
Doctor bot legal koruma submit eder.
Detective bot legal inspect submit eder.
DayVote fazında bot legal vote submit eder.
Submit edilen tüm action’lar normal validation yolundan geçer.
Invalid action server’ı çökertmez.
TypeScript temizdir.
```

---

# BOT-C — Bot Intelligence + Targeting

## Amaç

Bot zekâsı LLM değil, basit skor tabanlı algoritma olacak.

## Okunacak dosyalar

```text
apps/server/src/bots/bot-action-engine.ts
apps/server/src/bots/bot-targeting.ts
apps/server/src/bots/bot-memory.ts
apps/server/src/game/game-types.ts
packages/shared/src/game-types.ts
```

## Targeting yaklaşımı

Her hedef için skor hesapla:

```ts
score = baseRandom
score += roleWeight
score += memorySuspicion
score += teamSafety
score += recentActionWeight
score += intelligenceNoise
```

Sonra en yüksek skorlu legal target seçilir.

## random / Rastgele

```text
Legal target havuzundan random seçer.
Memory etkisi çok düşük olur.
Aynı kişiyi tekrar seçebilir; validator engellerse alternatif denenir.
Konuşma tarafında kısa ve düşük tutarlılıkta davranır.
```

## balanced / Dengeli

```text
Legal target seçer.
Dedektif daha önce bakmadığı kişiyi önceliklendirir.
Doktor son koruduğu kişiyi tekrar korumamaya çalışır.
Vampir gece vampir olmayan hedefleri önceliklendirir.
DayVote’ta suspicion score yüksek kişiye yönelir.
Konuşma ve oy çoğunlukla tutarlı olur.
```

## deceptive / Kurnaz

```text
Eğer bot vampirse vampir olmayanları hedefler.
Kendi vampir takımını açıkça savunmaz ama hedef şaşırtır.
DayVote’ta takım arkadaşına oy verme ağırlığı çok düşük olur.
Köylüyse balanced’dan biraz daha analitik davranır.
Detective ise bildiği vampiri konuşmada direkt hard-claim yapmadan öne çıkarır.
Doctor ise rolünü açık etmeden risk yorumu yapar.
```

## Kabul kriterleri

```text
random, balanced, deceptive aynı hedefleri her zaman seçmez.
balanced detective aynı kişiyi tekrar inspect etmeye çalışmaz.
deceptive vampire kendi takımını kolay kolay hedeflemez.
DayVote kararı suspicion score’dan etkilenir.
Kod deterministic test edilebilir helper’lara ayrılır.
```

---

# BOT-D — Bot Memory MVP

## Amaç

Bot kararları tamamen rastgele görünmesin.

## Yeni/var olan dosya

```text
apps/server/src/bots/bot-memory.ts
```

## Minimum memory tipi

```ts
export type BotMemory = {
  inspectedPlayerIds: string[];
  knownNonVampires: string[];
  knownVampires: string[];
  lastProtectedPlayerId?: string;
  lastVotedPlayerId?: string;
  suspicionByPlayerId: Record<string, number>;
  trustByPlayerId: Record<string, number>;
  lastSpeechPhaseId?: string;
  speechCountThisPhase: number;
};
```

## Güncellenecek olaylar

```text
DetectiveInspect sonucu -> inspected / knownVampires / knownNonVampires
DoctorProtect submit -> lastProtectedPlayerId
DayVote submit -> lastVotedPlayerId
Bot speech accuse -> suspicionByPlayerId +1
Bot speech support -> trustByPlayerId +1
Phase değişimi -> speechCountThisPhase reset
Room cleanup -> memory silinir
```

## Kabul kriterleri

```text
Bot memory oda bazlı tutulur.
Room kapanınca memory sızmaz.
Detective aynı hedefe tekrar bakma eğilimini azaltır.
Doctor son koruduğu hedefi hatırlar.
DayVote son oy bilgisini tutar.
```

---

# BOT-E — Server Bot Speech Event + Template Engine

## Amaç

Botlar gündüz kısa popup konuşmaları üretir. Konuşmalar server’da üretilir, mobile sadece gösterir.

## Okunacak dosyalar

```text
packages/shared/src/socket-events.ts
packages/shared/src/game-types.ts
apps/server/src/socket/socket-runtime.ts
apps/server/src/bots/bot-memory.ts
apps/server/src/bots/bot-targeting.ts
```

## Yeni dosyalar

```text
apps/server/src/bots/bot-speech-engine.ts
apps/server/src/bots/bot-speech-templates.ts
```

## Socket event

```text
Server -> Client:
game:bot:speech
```

Payload:

```ts
export type BotSpeechEvent = {
  roomCode: string;
  phaseId: string;
  speakerPlayerId: string;
  speakerName: string;
  message: string;
  tone: BotSpeechTone;
  intent: BotSpeechIntent;
  targetPlayerId?: string;
  durationMs: number;
  createdAt: number;
};
```

## Konuşulacak fazlar

```text
DayStart
DayDiscussion
MayorElection
DayVote
ExecutionResolve
TieDiscussion
HunterLastBreath
```

Gece konuşması yok.

## Frekans

```ts
maxSpeechPerBotPerDay = 2;
maxTotalBotSpeechPerPhase = Math.min(6, Math.ceil(botCount * 1.5));
speechDelayMs = random(1200, 4500);
popupDurationMs = 3500;
```

## Template sistemi

LLM yok. Sadece template.

Örnek:

```ts
self_defense: [
  "Bana yüklenmeniz kolay ama gece olanlar benim işim değil.",
  "Benim üzerime gelmeniz vampirlerin işine yarıyor."
]

accuse: [
  "{targetName} bana fazla sessiz geliyor.",
  "Bence {targetName} fazla kaçamak cevap verdi."
]

vote_hint: [
  "Ben oyumu büyük ihtimalle {targetName} tarafına kullanacağım."
]
```

## Private bilgi kuralları

```text
Vampire bot başka vampiri kesin bilgiyle açık etmez.
Doctor bot kimi koruduğunu söylemez.
Detective bot hard claim yapmaz; sadece soft yönlendirme yapar.
Ölü bot aktif konuşmaz.
Bot bilmediği bilgiyi kesin bilgi gibi söylemez.
```

## Kabul kriterleri

```text
DayDiscussion’da bot konuşma event’i gelir.
Gece fazında speech event gelmez.
Aynı anda spam olmaz.
Bot başına konuşma limiti çalışır.
Template içinde targetName doğru doldurulur.
Private bilgi sızmaz.
```

---

# BOT-F — Mobile Bot Speech Overlay

## Amaç

Server’dan gelen `game:bot:speech` eventlerini mobilde popup/bubble olarak göstermek.

## Okunacak dosyalar

```text
apps/mobile/src/socket/runtime.ts
apps/mobile/src/store/game-store.ts
apps/mobile/src/components/ScreenShell.tsx
apps/mobile/src/screens/*Game*.tsx
packages/shared/src/socket-events.ts
```

## Yeni dosyalar

```text
apps/mobile/src/ui/bot-speech-store.ts
apps/mobile/src/components/BotSpeechBubble.tsx
apps/mobile/src/components/BotSpeechOverlay.tsx
```

## Davranış

```text
runtime game:bot:speech dinler.
Event queue’ya alınır.
Aynı anda tek bubble gösterilir.
Süre bitince sıradaki gösterilir.
Phase değişince eski queue temizlenir.
Room’dan çıkınca queue temizlenir.
```

## UI formatı

```text
BOT · Kont Drakula
“Bence Yusuf bugün fazla sessiz.”
```

İlk implementasyonda global overlay yeterli. Player kartı üstü bubble ikinci polish işi.

## Kabul kriterleri

```text
Bot konuşması oyunda görünür.
Aynı anda tek popup görünür.
Popup süre sonunda kapanır.
Phase değişince eski konuşma kalmaz.
Mobile konuşma metni üretmez.
```

---

# BOT-G — Testler, Invariantlar ve Loglama

## Amaç

Bot sistemi oyunu bozmasın ve debug edilebilir olsun.

## Test önceliği

```text
Non-host bot ekleyemez.
Oyun başladıktan sonra bot eklenemez.
Bot role alır.
Bot gece legal action submit eder.
Bot DayVote legal vote submit eder.
Bot validator bypass etmez.
Bot speech gece çalışmaz.
Bot speech spam yapmaz.
Bot private bilgiyi sızdırmaz.
Room cleanup memory/timer temizler.
```

## Log eventleri

```text
room.bot.added
room.bot.removed
room.bot.intelligence_changed
bot.action.submit
bot.action.skipped
bot.action.invalid_target
bot.memory.updated
bot.speech.emit
bot.speech.skipped
bot.timer.cleared
```

## Kabul kriterleri

```text
İlgili testler geçer.
TypeScript temizdir.
Server bot action hatasında çökmez.
Timer leak yoktur.
Memory room cleanup sonrası temizlenir.
```

---

# BOT-H — Final Polish ve Manuel Test Matrisi

## Amaç

Kod tamamlandıktan sonra oynanabilirliği kontrol etmek.

## Manuel test checklist (BOT-H)

Her maddeyi test sırasında doldur: H1–H20 için **Geçti / Kaldı** hücresine `Geçti` veya `Kaldı` (+ kısa not); H21–H23 için **Geçti** ve **Kaldı** satırlarına aynı şekilde işaretle.

---

### H1 — 1 insan + 3 bot

| Alan | İçerik |
|------|--------|
| **Beklenen** | Oyun kurallarına uygun başlar; fazlar ilerler; botlar gece/gündüz aksiyonlarını zamanında verir; oyun kilitlenmez. |
| **Nasıl test edilir** | Host olarak 3 bot ekle; minimum oyuncu ile başlat; en az bir gece + bir gündüz turunu bitir. |
| **Geçti / Kaldı** | |

---

### H2 — 2 insan + 2 bot

| Alan | İçerik |
|------|--------|
| **Beklenen** | İnsan oyuncular UI’dan oy verebilir; botlar da oylarını gönderir; deadlock yok. |
| **Nasıl test edilir** | 2 gerçek cihaz/simülatör veya 2 sekme mümkünse; değilse 1 insan + gözlem; oyunu sonuna kadar veya MayorElection’a kadar oyna. |
| **Geçti / Kaldı** | |

---

### H3 — 3 insan + 1 bot

| Alan | İçerik |
|------|--------|
| **Beklenen** | Tek bot tüm uygun fazlarda doğru hedef seçer; insan çoğunluğu oyun akışını bozmaz. |
| **Nasıl test edilir** | 1 bot ile tam tur; özellikle DayVote’da bot oyu listelerde tutarlı görünür. |
| **Geçti / Kaldı** | |

---

### H4 — 4 insan + 4 bot

| Alan | İçerik |
|------|--------|
| **Beklenen** | Yüksek dolulukta performans kabul edilebilir; socket/event gecikmesi oyunu bozmaz; sıra ve faz geçişleri doğru. |
| **Nasıl test edilir** | 8 slot dolu oda; birkaç gece üst üste gözle; server logda aşırı hata yok. |
| **Geçti / Kaldı** | |

---

### H5 — 1 insan + 10 bot

| Alan | İçerik |
|------|--------|
| **Beklenen** | Oda limiti izin veriyorsa oyun başlar; bot action kuyruğu/sunucu taşkın yapmaz; UI hâlâ kullanılabilir. |
| **Beklenen (limit)** | Limit 8 ise ekleme reddedilir veya UI uyarı verir — dokümantasyonla tutarlı olmalı. |
| **Nasıl test edilir** | Mümkün olan maksimum bota kadar ekle; başlatmayı dene. |
| **Geçti / Kaldı** | |

---

### H6 — Non-host bot ekleme denemesi

| Alan | İçerik |
|------|--------|
| **Beklenen** | Sadece host bot ekleyebilir; non-host’ta buton yok veya işlem reddedilir/hata mesajı net. |
| **Nasıl test edilir** | İkinci oyuncu ile lobide “bot ekle” benzeri aksiyonu dene (varsa). |
| **Geçti / Kaldı** | |

---

### H7 — Oyun başladıktan sonra bot ekleme denemesi

| Alan | İçerik |
|------|--------|
| **Beklenen** | Bot eklenemez veya sessizce ignore; state bozulmaz. |
| **Nasıl test edilir** | Oyun başladıktan sonra (ilk fazdan sonra) bot ekleme UI/socket ile tekrar dene. |
| **Geçti / Kaldı** | |

---

### H8 — random / balanced / deceptive bot

| Alan | İçerik |
|------|--------|
| **Beklenen** | Her zeka seviyesi seçilebilir; oyun yasal aksiyonlarla devam eder; deceptive “hile” yapmaz (validator dışı state yok). |
| **Nasıl test edilir** | Üç ayrı kısa oyun veya aynı odada sırayla değiştir (destekleniyorsa); hedefleme/konuşma farkı gözlemsel. |
| **Geçti / Kaldı** | |

---

### H9 — Bot speech açık

| Alan | İçerik |
|------|--------|
| **Beklenen** | Uygun fazda (ör. gündüz) `game:bot:speech` ile overlay/bubble gelir; metin sunucudan; spam yok. |
| **Nasıl test edilir** | Ayarlarda speech açık; DayDiscussion veya speech’in tanımlı olduğu fazda bekle. |
| **Geçti / Kaldı** | |

---

### H10 — Bot speech kapalı (varsa)

| Alan | İçerik |
|------|--------|
| **Beklenen** | UI’da konuşma balonu/popup çıkmaz veya ayar kapalıyken client göstermez; oyun yine çalışır. |
| **Nasıl test edilir** | Speech toggle/env kapalı; aynı senaryoyu H9 ile karşılaştır. |
| **Geçti / Kaldı** | |

---

### H11 — Botlu VampireVote

| Alan | İçerik |
|------|--------|
| **Beklenen** | Gece vampir fazı bot oyuncuları geçerli hedefe oy kullanır; resolve doğru. |
| **Nasıl test edilir** | En az bir vampir bot ile gece turu; sonuç ekranı/log ile doğrula. |
| **Geçti / Kaldı** | |

---

### H12 — Botlu DoctorProtect

| Alan | İçerik |
|------|--------|
| **Beklenen** | Doktor bot kendine/son hedefe kurallara uygun koruma verir; faz biter. |
| **Nasıl test edilir** | Rolde doktor bot olduğundan emin ol; bir gece Doctor fazını izle. |
| **Geçti / Kaldı** | |

---

### H13 — Botlu DetectiveInspect

| Alan | İçerik |
|------|--------|
| **Beklenen** | Dedektif bot inceleme yapar; sonuç sadece ilgili oyuncuya/private kanalda kalır (sızmaz). |
| **Nasıl test edilir** | Dedektif bot ile gece; başka oyuncu UI’ında vampir/dedektif sonucu görünmemeli. |
| **Geçti / Kaldı** | |

---

### H14 — Botlu DayVote

| Alan | İçerik |
|------|--------|
| **Beklenen** | Gündüz oylamada botlar oy kullanır; eşitlik/kazanma kuralları bozulmaz. |
| **Nasıl test edilir** | DayVote fazında tüm botların oy verdiğini state veya UI’dan doğrula. |
| **Geçti / Kaldı** | |

---

### H15 — MayorElection: bot mayor vote (varsa)

| Alan | İçerik |
|------|--------|
| **Beklenen** | Mayor seçimi aktif senaryoda botlar adaylık/oy kurallarına uygun davranır; seçim tamamlanır. |
| **Nasıl test edilir** | Mayor modunu açan oda ayarı ile oyun başlat; mayor fazını bir kez geçir. |
| **Geçti / Kaldı** | |

---

### H16 — GameOver sonrası timer / speech duruyor mu

| Alan | İçerik |
|------|--------|
| **Beklenen** | Oyun bitince bot action timer’ları ve speech kuyruğu/emit durur; yeni event gelmez veya client ignore eder. |
| **Nasıl test edilir** | Kazanan ekranına gel; 30–60 sn bekle; ekstra bot konuşması veya faz geçişi olmamalı. |
| **Geçti / Kaldı** | |

---

### H17 — Room leave / cleanup sonrası memory temizleniyor mu

| Alan | İçerik |
|------|--------|
| **Beklenen** | Odadan çıkınca veya oda silinince bot bellek/timer kayıtları temizlenir; tekrar girişte eski oda verisi yok. |
| **Nasıl test edilir** | Oyun bitir veya lobiden ayrıl; yeni oda oluştur; önceki bot isimleri/ayarları karışmamalı (gözlem + mümkünse server log). |
| **Geçti / Kaldı** | |

---

### H18 — Mobile: popup tek mi görünüyor

| Alan | İçerik |
|------|--------|
| **Beklenen** | Aynı anda yalnızca tek bot speech overlay; üst üste binme yok. |
| **Nasıl test edilir** | Birden fazla bot konuşmasının tetiklendiği fazda ekran görüntüsü veya gözle kontrol. |
| **Geçti / Kaldı** | |

---

### H19 — Speech queue düzgün mü

| Alan | İçerik |
|------|--------|
| **Beklenen** | Kısa sürede çok event gelse bile sırayla gösterilir; süre dolunca sıradaki gelir. |
| **Nasıl test edilir** | Çok botlu gündüz turu; konuşmaların sırayla ve eksiksiz (veya bilinçli drop ile tutarlı) olduğunu doğrula. |
| **Geçti / Kaldı** | |

---

### H20 — Phase değişince popup / queue temizleniyor mu

| Alan | İçerik |
|------|--------|
| **Beklenen** | Faz değişiminde eski phase’e ait kuyruk veya görünen bubble kapanır; yanlış fazda eski metin kalmaz. |
| **Nasıl test edilir** | Konuşma gösterilirken hızlıca sonraki faza geç (timer veya aksiyonlarla); UI anında temizlenmeli. |
| **Geçti / Kaldı** | |

---

### H21 — Reconnect testi

| Alan | İçerik |
|------|--------|
| **Beklenen** | Oyuncu uygulamayı kapatıp tekrar girince aynı playerId/session ile odaya döner; rol/state korunur; botlar çalışmaya devam eder. |
| **Nasıl test edilir** | Oyun başladıktan sonra bir cihazda app’i kapat/aç veya bağlantıyı kes/geri getir. |
| **Geçti** | |
| **Kaldı** | |

---

### H22 — Host disconnect / reconnect testi

| Alan | İçerik |
|------|--------|
| **Beklenen** | Host kısa süre koparsa oda bozulmaz; geri geldiğinde host yetkileri devam eder; bot action/speech sistemi bozulmaz. |
| **Nasıl test edilir** | Host cihazında bağlantıyı kes, birkaç saniye sonra geri bağlan. |
| **Geçti** | |
| **Kaldı** | |

---

### H23 — Popup UI çakışma testi

| Alan | İçerik |
|------|--------|
| **Beklenen** | Bot speech popup; voting butonu, hedef seçme kartları, phase banner, ayarlar/pause ekranı ve game over ekranını kapatmaz. |
| **Nasıl test edilir** | Bot konuşmaları açıkken DayVote, NightAction, MayorElection ve GameOver ekranlarını gözlemle. |
| **Geçti** | |
| **Kaldı** | |

---

## Final doğrulama komutları

```bash
npm run build -w @vampir-koylu/shared
npx tsc -p apps/server/tsconfig.json --noEmit
npx tsc -p apps/mobile/tsconfig.json --noEmit
git diff --check
```

Projede test scriptleri varsa:

```bash
npm test -w apps/server
npm test -w apps/mobile
```

---

# Yeni Chat İçin Kullanılacak Prompt Şablonları

## BOT-B prompt

```text
Vampir Köylü projemde sadece BOT-B fazını uygula: Server Bot Action Engine.

Önce git status al. Sonra sadece şu işi yap:
- Botların VampireVote, DetectiveInspect, DoctorProtect ve DayVote fazlarında otomatik action submit etmesini sağla.
- Bot action normal game action submission path’i üzerinden geçsin.
- Validator bypass etme.
- Direkt game state mutate etme.
- LLM/API/dış servis kullanma.
- Konuşma sistemi ekleme; bu BOT-E fazı.
- Mobile UI’a dokunma; sadece gerekli shared type/event eksikse küçük patch yap.
- Önceden uygulanmış BOT-A parçalarını tekrar yazma.

Okunacak dosyalar:
- apps/server/src/socket/socket-runtime.ts
- apps/server/src/rooms/room-manager.ts
- apps/server/src/game/*action*.ts
- apps/server/src/game/*resolver*.ts
- apps/server/src/game/*phase*.ts
- packages/shared/src/game-types.ts
- packages/shared/src/socket-events.ts

Yeni dosyalar gerekirse:
- apps/server/src/bots/bot-types.ts
- apps/server/src/bots/bot-action-engine.ts
- apps/server/src/bots/bot-targeting.ts
- apps/server/src/bots/bot-memory.ts

Kabul kriterleri:
- Bot yüzünden gece fazı kilitlenmez.
- Botlar legal action submit eder.
- Invalid action loglanır ama server çökmez.
- TypeScript temizdir.
- Sonda sadece değişen dosyaları ve doğrulama sonucunu yaz.
```

## BOT-C prompt

```text
Sadece BOT-C fazını uygula: Bot Intelligence + Targeting.

LLM/API kullanma. Skor tabanlı algoritmik seçim yap.
random, balanced, deceptive davranışlarını bot-targeting helper’larında uygula.
Mevcut action engine’i bozma.
Mobile UI’a dokunma.
Konuşma sistemi ekleme.

Kabul kriterleri:
- random daha rastgele seçim yapar.
- balanced role/memory bazlı makul seçim yapar.
- deceptive vampire kendi takımını kolay kolay hedeflemez.
- DayVote suspicion score’dan etkilenir.
- TypeScript temizdir.
```

## BOT-D prompt

```text
Sadece BOT-D fazını uygula: Bot Memory MVP.

Bot memory oda bazlı tutulacak.
Room cleanup olunca memory temizlenecek.
Detective inspect, doctor protect, day vote ve speech intentlerinden minimum memory güncellenecek.
LLM/API yok.
Mobile UI yok.

Kabul kriterleri:
- Memory room bazlıdır.
- Room kapanınca temizlenir.
- Detective aynı hedefe tekrar bakma eğilimini azaltır.
- Doctor son koruduğunu hatırlar.
- TypeScript temizdir.
```

## BOT-E prompt

```text
Sadece BOT-E fazını uygula: Server Bot Speech Event + Template Engine.

Server game:bot:speech event’i üretsin.
Konuşmalar sadece gündüz/sosyal fazlarda olsun.
Gece konuşması yok.
LLM/API yok; sadece template.
Private bilgi sızdırma.
Spam limiti uygula.
Mobile sadece event alacak; overlay BOT-F fazında yapılacaksa dokunma.

Kabul kriterleri:
- DayDiscussion’da speech event emit edilir.
- Gece speech emit edilmez.
- Speech limiti çalışır.
- Private bilgi sızmaz.
- TypeScript temizdir.
```

## BOT-F prompt

```text
Sadece BOT-F fazını uygula: Mobile Bot Speech Overlay.

Server’dan gelen game:bot:speech eventlerini dinle.
Queue ile aynı anda tek popup göster.
Phase değişince temizle.
Mobile konuşma üretmesin.
Mobile hedef seçmesin.

Kabul kriterleri:
- Popup görünür.
- Süre sonunda kapanır.
- Queue çalışır.
- Phase değişince temizlenir.
- TypeScript temizdir.
```

---

# En Kritik Uyarı

Bu bot sistemi “zeki bot” diye şişirilmemeli.

Doğru ilk sürüm:

```text
Basit legal action.
Basit role-aware target scoring.
Küçük memory.
Kısa template konuşma.
Spam limiti.
Private bilgi koruması.
Net BOT rozeti.
```

Yanlış ilk sürüm:

```text
LLM entegrasyonu.
Dış API.
Mobilde bot kararı.
Global chat.
Aşırı uzun konuşmalar.
Dedektifin kesin hard claim atması.
Validator bypass.
Oyunu kilitleyecek karmaşık state machine.
```
