# Backend Realtime Oyun Sunucusu Planı

## 1. Proje Özeti

Bu doküman, Vampir Köylü oyununun sadece backend realtime oyun sunucusu planını tanımlar. Sistem Fastify + Socket.IO + TypeScript ile geliştirilir. Sunucu, oda yönetimi, oyuncu oturumu, reconnect, state machine tabanlı oyun akışı, rol aksiyon çözümleme, oylama ve kazanma kontrolünü server-authoritative şekilde yürütür.

Temel prensip: istemci sadece görüntüler ve aksiyon gönderir; nihai karar, süre, faz geçişi, rol ve sonuç hesapları daima sunucu tarafındadır.

## 2. Mimari

### 2.1 Teknoloji

- Runtime: Node.js
- Dil: TypeScript
- HTTP Framework: Fastify
- Realtime: Socket.IO
- Doğrulama: Zod
- Loglama: Pino
- Test: Vitest
- Deploy: Railway / Render / Fly.io / VPS

### 2.2 Başlangıç Storage Kararı

- MVP storage: in-memory
- Oda kapanınca veriler silinir
- Reconnect için oyuncu oturumu oda içinde tutulur
- Redis zorunlu değildir, ancak geçişe uygun arayüz tasarımı yapılır

### 2.3 Bileşenler

- `RoomManager`: oda yaratma, join/leave, kapasite ve cleanup
- `SessionManager`: `deviceId` + `playerSessionToken` yaşam döngüsü
- `GameEngine`: faz state machine ve kurallar
- `ActionResolver`: gece/gündüz aksiyon çözümü
- `TimerService`: faz süreleri ve `phaseEndsAt` üretimi
- `EventGateway`: socket event doğrulama, yönlendirme, broadcast/private publish

## 3. Domain Model

### 3.1 Temel Tipler

- `Room`: `roomCode`, `status`, `players`, `gameState`, `createdAt`, `lastActivityAt`
- `Player`: `playerId`, `nickname`, `deviceId`, `sessionToken`, `isAlive`, `role`, `socketId`
- `GameState`: `phase`, `round`, `phaseEndsAt`, `aliveCounts`, `votes`, `nightActions`, `winner`

### 3.2 Oyun Fazları

`Lobby -> RoleReveal -> NightStart -> VampireVote -> DetectiveInspect -> DoctorProtect -> NightResolve -> DayStart -> DayDiscussion -> DayVote -> ExecutionResolve -> WinCheck -> (GameOver | NightStart)`

### 3.3 Rol Dağılımı (MVP)

| Oyuncu Sayısı | Vampir | Dedektif | Doktor | Köylü |
|---:|---:|---:|---:|---:|
| 4 | 1 | 0 | 0 | 3 |
| 5-6 | 1 | 1 | 1 | Kalan |
| 7-9 | 2 | 1 | 1 | Kalan |
| 10-13 | 3 | 1 | 1 | Kalan |
| 14-17 | 4 | 1 | 1 | Kalan |
| 18-20 | 5 | 1 | 1 | Kalan |

## 4. Event Sözleşmesi

### 4.1 Client -> Server

| Event | Amaç | Zorunlu Alanlar |
|---|---|---|
| `room:create` | Oda oluşturma | `ClientIdentity`, `nickname` |
| `room:join` | Odaya katılma / reconnect | `ClientIdentity`, `roomCode`, `nickname?` |
| `room:leave` | Odadan çıkış | `ClientIdentity`, `roomCode` |
| `room:start` | Oyunu başlatma talebi | `ClientIdentity`, `roomCode` |
| `game:action:submit` | Rol veya oy aksiyonu | `ClientIdentity`, `roomCode`, `actionType`, `targetPlayerId?`, `round`, `phase` |

### 4.2 Server -> Client

| Event | Alıcı | Amaç |
|---|---|---|
| `room:state` | Oda içi broadcast | Oda snapshot senkronu |
| `game:phase` | Oda içi broadcast | Faz değişimi + `phaseEndsAt` |
| `game:private-role` | Tek oyuncu | Gizli rol gönderimi |
| `game:private-result` | Tek oyuncu | Dedektif sonucu gibi kişisel bilgi |
| `game:over` | Oda içi broadcast | Kazanan ve final özet |
| `error:event` | Talep sahibi socket | Doğrulama/iş kuralı hatası |

### 4.3 Ortak Payload Tipleri

- `ClientIdentity`
  - `deviceId: string`
  - `playerSessionToken?: string`
- `RoomStateSnapshot`
  - `roomCode`, `status`, `players[]`, `minPlayers`, `maxPlayers`
- `GameStateSnapshotPublic`
  - `phase`, `round`, `phaseEndsAt`, `alivePlayers`, `voteState`, `tieCount`
- `GameStatePrivateDelta`
  - `role?`, `detectiveResult?`, `isActionAllowed`, `reason?`
- `ActionSubmission`
  - `actionType`, `targetPlayerId?`, `roomCode`, `phase`, `round`

### 4.4 Event Bazlı Sunucu Doğrulamaları

Her aksiyonda minimum şu kontroller yapılır:

- Oda mevcut mu?
- Oyuncu bu odaya ait mi?
- Oyuncu canlı mı (gerekli fazlarda)?
- Faz uygun mu?
- Rol bu aksiyona yetkili mi?
- Aynı turda duplicate submit var mı?
- Round/phase alanı sunucu state’i ile uyumlu mu?

## 5. Oyun Motoru Akışı

### 5.1 State Machine Prensibi

- Faz geçişleri tek merkez `GameEngine` üzerinden olur
- Dağınık if/else yerine deterministik transition tablosu kullanılır
- Her fazın başlangıcında `phaseEndsAt` hesaplanır ve yayınlanır

### 5.2 Timer Ownership

- Tek zaman otoritesi server’dır
- İstemci sayaçları görseldir, sunucu kararını etkileyemez
- Faz bitimi `TimerService` ile tetiklenir; bitim sonrası resolver çalışır

### 5.3 Gece Aksiyon Çözümleme Kuralları

- Vampir çoğunluk oyu hedefi belirler
- Eşitlikte eşit adaylar arasında rastgele seçim yapılır
- Hiç vampir oy vermezse yaşayan köylü tarafı hedef havuzundan rastgele seçim yapılır
- Doktor ardışık iki tur kendini koruyamaz
- Dedektif sonucu sadece `Vampir` / `Vampir değil` olarak private gönderilir

### 5.4 Gündüz Oylama Kuralları

- En yüksek oyu alan elenir
- İlk eşitlikte tekrar tartışma + ikinci oylama
- İkinci oylamada da eşitlik varsa kimse elenmez, geceye geçilir

### 5.5 Win Check

- Yaşayan vampir sayısı yaşayan köylü takımı sayısına eşit/fazlaysa vampir kazanır
- Tüm vampirler elendiyse köylüler kazanır

## 6. Fazlara Bölünmüş Backend Teslimat Planı

### Faz A — Bootstrap

- Fastify app, health endpoint, Socket.IO temel katman
- Ortak event isimleri ve payload şemaları
- Konfigürasyon ve env doğrulama

Çıktı: Sunucu ayağa kalkar, health ve temel socket bağlantısı doğrulanır.

### Faz B — Room + Session + Reconnect

- `room:create`, `room:join`, `room:leave`
- Oda kapasite/min-max kontrolü
- `deviceId` tabanlı oyuncu eşleştirme
- `playerSessionToken` üretimi ve yenileme
- Aynı `deviceId` ikinci bağlantıda eski socket devreden çıkarma

Çıktı: Oyuncular odaya girer, kopup geri bağlandığında state korunur.

### Faz C — Role Assignment + Scheduler

- Oyuncu sayısına göre rol dağıtımı
- `Lobby -> RoleReveal -> NightStart` akışı
- Faz süreleri ve `phaseEndsAt` yayını

Çıktı: Oyun otomatik başlar, roller private dağıtılır.

### Faz D — Night Actions + Resolver

- `game:action:submit` ile vampir/dedektif/doktor aksiyonları
- Gece resolver
- Ölüm/koruma/sorgu sonuçlarının state’e yazılması

Çıktı: Gece turu deterministik ve kural uyumlu çalışır.

### Faz E — Day Vote + Execution

- DayDiscussion timer
- DayVote aksiyonları
- Eşitlikte tekrar mekanizması
- ExecutionResolve

Çıktı: Gündüz oylama ve eleme akışı tamamlanır.

### Faz F — Win + GameOver + Restart/Close

- WinCheck
- `game:over` yayını
- Yeni oyun veya oda kapatma davranışı

Çıktı: Oyun baştan sona kapanış dahil oynanır.

### Faz G — Stabilizasyon

- Disconnect edge case’leri
- Race condition ve duplicate submit korumaları
- Idempotent aksiyon işleme
- Cleanup zamanlayıcıları

Çıktı: Realtime senaryolarda daha dayanıklı davranış.

### Faz H — Operasyon

- Yapısal loglama ve temel metrikler
- Deploy dokümantasyonu
- Redis transition hookları (opsiyonel)

Çıktı: Prod’a yaklaşan operasyonel hazırlık.

## 7. Test Planı

### 7.1 Unit Testler

- Rol dağılım tablosu: 4, 5-6, 7-9, 10-13, 14-17, 18-20
- Gece resolver: vampir eşitlik/oy yok/doktor koruma/dedektif sonucu
- Oylama resolver: tek kazanan/ilk eşitlik/ikinci eşitlik
- Win condition

### 7.2 Entegrasyon Testleri (Socket)

- Oda oluşturma/katılma/lobi senkronu
- Reconnect sonrası rol/canlılık/sıra bilgisinin korunması
- Aynı `deviceId` çift bağlantı çatışması
- Faz geçişlerinde `phaseEndsAt` tutarlılığı

### 7.3 Dayanıklılık Senaryoları

- Faz son saniyesinde aksiyon gönderimi
- Duplicate action submit
- Resolver çalışırken disconnect
- Oda tamamen boşalınca cleanup doğrulaması

## 8. Operasyon ve Deploy

### 8.1 Hosting Stratejisi

- İlk hedef: Railway veya Render
- Tek instance ile MVP
- Sticky session zorunluluğu olmadan memory state (tek instance)

### 8.2 Redis Geçiş Planı (Opsiyonel)

- `StorageAdapter` arayüzü ile memory/redis soyutlama
- Oda state TTL desteği
- Çok instance senaryosunda pub/sub ile socket scale-out

### 8.3 Güvenlik Kontrolleri

- Tahmini zor oda kodu üretimi
- Session token rotasyonu ve doğrulama
- Private event sızıntısını önleyen hedefli emit
- Her aksiyonda oda/oyuncu/faz/rol yetki doğrulaması

### 8.4 Varsayımlar

- Kalıcı kullanıcı hesabı yok
- Oda kapanınca oyun geçmişi saklanmaz
- Sunucu authoritative model dışına çıkılmaz
- Redis ilk sürümde zorunlu değildir
