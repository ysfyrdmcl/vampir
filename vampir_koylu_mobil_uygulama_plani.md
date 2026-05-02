# Vampir Köylü Mobil Uygulama Planı

## 1. Proje Özeti

Bu proje, klasik Vampir-Köylü oyununu temel alan mobil bir sosyal çıkarım oyunudur. Oyuncular aynı fiziksel ortamda bulunur. Uygulama sesli konuşma, yazılı chat veya uzaktan oynama altyapısı sunmaz. Oyuncular yüz yüze konuşur; mobil uygulama ise oda yönetimi, rol dağıtımı, gece/gündüz akışı, gizli rol ekranları, geri sayımlar, rol aksiyonları ve sonuç ekranlarını yönetir.

Kullanıcı girişi olmayacaktır. Oyuncular oda numarası ile oyuna katılır. Odaya ilk katılımda cihaz kimliği üzerinden geçici oyuncu kaydı oluşturulur. Oyuncunun bağlantısı koparsa veya uygulama kapanırsa, aynı cihaz aynı oda numarası ile tekrar bağlandığında rolü ve oyundaki durumu devam eder.

Oda sahibi moderatör olmayacaktır. Oyun kendi içinde otomatik moderatör gibi çalışacaktır. Gece/gündüz geçişleri, rol sıraları, aksiyon zamanları, oylama süreçleri ve sonuç hesaplamaları backend tarafından yönetilecektir.

İlk sürüm Türkçe olacaktır. Görsel tarz kart oyunu atmosferinde ilerleyecektir. Oyuncu, karakteri haritada gezdirmez; oyun metin, kart, görsel ve küçük animasyonlarla ilerler.

### Temel hedefler

- React Native ile gerçek mobil uygulama geliştirme deneyimi kazanmak
- Socket tabanlı realtime oda sistemi kurmak
- Backend tarafında oyun state machine mantığını deneyimlemek
- Android ve iOS mağaza yayınına uygun üretim kalitesine yaklaşmak
- Minimum maliyetle çalışabilecek bir mimari kurmak
- Küçük ama gerçekçi bir online/realtime ürün mimarisi deneyimlemek

### Kapsam dışı

- Kullanıcı hesabı
- Sesli konuşma
- Yazılı chat
- Uzaktan oynama modu
- Reklam veya premium gelir modeli
- Kalıcı kullanıcı profili
- Oda kapandıktan sonra oyun geçmişi saklama

---

## 2. Tech Stack

## 2.1 Mobil Uygulama

| Amaç | Teknoloji |
|---|---|
| Mobil framework | React Native |
| Dil | TypeScript |
| Başlangıç geliştirme altyapısı | Expo |
| Navigasyon | React Navigation |
| Global state | Zustand |
| Socket client | socket.io-client |
| Animasyon | React Native Reanimated |
| Kart/efekt animasyonları | Lottie |
| SVG/ikon | react-native-svg |
| Form yönetimi | React Hook Form |
| Validasyon | Zod |
| Local cihaz verisi | Expo SecureStore veya AsyncStorage |
| Splash/icon yönetimi | Expo config |
| Build & store süreci | EAS Build |

### Mobil taraf kararları

- TypeScript zorunlu kullanılmalı.
- Rol bilgisi client tarafında kalıcı olarak güvenilmez kabul edilmeli.
- Client sadece kendisine server tarafından gönderilen rol bilgisini gösterir.
- Oyun sonucu client tarafından hesaplanmaz.
- UI state ile oyun state birbirine karıştırılmamalı.
- Socket event isimleri frontend/backend ortak tip dosyalarıyla yönetilmeli.

---

## 2.2 Backend

| Amaç | Teknoloji |
|---|---|
| Runtime | Node.js |
| Dil | TypeScript |
| Framework | Fastify veya NestJS |
| Realtime | Socket.IO |
| Oyun state | In-memory başlangıç, sonra Redis opsiyonel |
| Geçici oda verisi | Memory / Redis TTL |
| API validasyon | Zod |
| Logging | Pino |
| Test | Vitest |
| Deployment | Railway / Render / Fly.io / VPS |
| Vercel kullanımı | Landing page, basit tanıtım sitesi, domain yönlendirme, admin/debug panel opsiyonu |

### Backend framework kararı

Başlangıç için önerilen tercih: **Fastify + Socket.IO + TypeScript**

Sebep:

- NestJS daha kurumsal ve ağır yapı sağlar.
- Fastify daha sade, hızlı ve öğrenme eğrisi daha düşük olur.
- Bu proje için oyun motoru ve socket state yönetimi zaten yeterince karmaşık olacak. Backend framework tarafında gereksiz ağırlık ilk sürümde zaman kaybettirir.

---

## 2.3 Veritabanı ve State

İlk sürümde kalıcı kullanıcı hesabı olmadığı için klasik büyük veritabanı ihtiyacı düşük.

### Başlangıç önerisi

- Aktif oda state'i: memory
- Oda kapanınca veri silinir
- Reconnect için oda içindeki oyuncu kaydı cihaz kimliği ile tutulur
- Production'a yaklaşırken Redis eklenir

### Redis neden gerekebilir?

- Server restart olursa aktif odaların kaybolmasını azaltmak
- Birden fazla backend instance çalıştırmak
- Oda state'lerine TTL vermek
- Socket scale-out yapmak

İlk MVP için Redis zorunlu değildir. Ancak mimari Redis eklenebilir şekilde tasarlanmalıdır.

---

## 2.4 Hosting

Vercel ana realtime socket server için doğru yer olarak seçilmemelidir. Vercel daha çok frontend, landing page, dokümantasyon, basit API route ve domain yönetimi için kullanılmalıdır.

Realtime oyun server için öneriler:

1. Railway
2. Render
3. Fly.io
4. Düşük maliyetli VPS
5. İleride Redis destekli ölçeklenebilir yapı

Başlangıç için en pratik yapı:

- Mobil app: Expo / EAS
- Backend: Railway veya Render
- Landing page: Vercel
- Domain: Vercel üzerinden yönlendirme veya DNS yönetimi

---

## 3. Proje Ağacı / Work Tree

Önerilen yapı monorepo şeklindedir.

```txt
vampir-koylu/
├── apps/
│   ├── mobile/
│   │   ├── app.json
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── App.tsx
│   │   │   │   └── navigation/
│   │   │   │       ├── RootNavigator.tsx
│   │   │   │       └── routes.ts
│   │   │   ├── screens/
│   │   │   │   ├── WelcomeScreen.tsx
│   │   │   │   ├── CreateRoomScreen.tsx
│   │   │   │   ├── JoinRoomScreen.tsx
│   │   │   │   ├── NicknameScreen.tsx
│   │   │   │   ├── LobbyScreen.tsx
│   │   │   │   ├── RoleRevealScreen.tsx
│   │   │   │   ├── NightScreen.tsx
│   │   │   │   ├── RoleActionScreen.tsx
│   │   │   │   ├── DayScreen.tsx
│   │   │   │   ├── VoteScreen.tsx
│   │   │   │   ├── ResultScreen.tsx
│   │   │   │   └── GameOverScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── RoleCard.tsx
│   │   │   │   ├── PlayerList.tsx
│   │   │   │   ├── Countdown.tsx
│   │   │   │   ├── GamePhaseBanner.tsx
│   │   │   │   ├── ActionButton.tsx
│   │   │   │   └── AnimatedText.tsx
│   │   │   ├── features/
│   │   │   │   ├── room/
│   │   │   │   │   ├── room.store.ts
│   │   │   │   │   ├── room.types.ts
│   │   │   │   │   └── room.service.ts
│   │   │   │   ├── game/
│   │   │   │   │   ├── game.store.ts
│   │   │   │   │   ├── game.types.ts
│   │   │   │   │   └── game.selectors.ts
│   │   │   │   └── device/
│   │   │   │       ├── device.service.ts
│   │   │   │       └── device.storage.ts
│   │   │   ├── socket/
│   │   │   │   ├── socket.client.ts
│   │   │   │   ├── socket.events.ts
│   │   │   │   └── socket.handlers.ts
│   │   │   ├── theme/
│   │   │   │   ├── colors.ts
│   │   │   │   ├── spacing.ts
│   │   │   │   └── typography.ts
│   │   │   ├── assets/
│   │   │   │   ├── roles/
│   │   │   │   ├── animations/
│   │   │   │   ├── icons/
│   │   │   │   └── sounds/
│   │   │   └── utils/
│   │   │       ├── delay.ts
│   │   │       └── format.ts
│   │   └── eas.json
│   │
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.ts
│   │   │   ├── config/
│   │   │   │   ├── env.ts
│   │   │   │   └── cors.ts
│   │   │   ├── http/
│   │   │   │   ├── health.routes.ts
│   │   │   │   └── room.routes.ts
│   │   │   ├── socket/
│   │   │   │   ├── socket.server.ts
│   │   │   │   ├── socket.events.ts
│   │   │   │   ├── socket.auth.ts
│   │   │   │   └── socket.handlers.ts
│   │   │   ├── game/
│   │   │   │   ├── game-room.ts
│   │   │   │   ├── game-engine.ts
│   │   │   │   ├── game-state.ts
│   │   │   │   ├── game-phase.ts
│   │   │   │   ├── game-actions.ts
│   │   │   │   ├── game-events.ts
│   │   │   │   ├── win-condition.ts
│   │   │   │   └── role-assignment.ts
│   │   │   ├── roles/
│   │   │   │   ├── role.types.ts
│   │   │   │   ├── villager.role.ts
│   │   │   │   ├── vampire.role.ts
│   │   │   │   ├── detective.role.ts
│   │   │   │   └── doctor.role.ts
│   │   │   ├── rooms/
│   │   │   │   ├── room-manager.ts
│   │   │   │   ├── room-code.ts
│   │   │   │   ├── room-state.ts
│   │   │   │   └── room-cleanup.ts
│   │   │   ├── players/
│   │   │   │   ├── player.types.ts
│   │   │   │   ├── player-session.ts
│   │   │   │   └── player-reconnect.ts
│   │   │   ├── storage/
│   │   │   │   ├── memory-store.ts
│   │   │   │   └── redis-store.ts
│   │   │   ├── validation/
│   │   │   │   ├── room.schema.ts
│   │   │   │   └── action.schema.ts
│   │   │   └── utils/
│   │   │       ├── random.ts
│   │   │       └── timers.ts
│   │   └── tests/
│   │       ├── role-assignment.test.ts
│   │       ├── win-condition.test.ts
│   │       └── game-engine.test.ts
│   │
│   └── web/
│       ├── package.json
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   └── pages/
│       └── README.md
│
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── socket-events.ts
│   │   │   ├── game.types.ts
│   │   │   ├── room.types.ts
│   │   │   ├── role.types.ts
│   │   │   └── constants.ts
│   │   └── package.json
│   │
│   └── config/
│       ├── eslint-config/
│       └── tsconfig/
│
├── docs/
│   ├── game-rules.md
│   ├── socket-events.md
│   ├── deployment.md
│   └── store-release.md
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## 4. Features

## 4.1 Oda Sistemi

- Oda oluşturma
- Oda numarası ile katılma
- Oyuncu adı girme
- Oyuncu listesi görüntüleme
- Minimum 4 oyuncu ile başlatma
- Maksimum 20 oyuncu sınırı
- Oda doluysa katılımı engelleme
- Oyun başladıktan sonra yeni oyuncu kabul etmeme
- Oda kapanınca tüm geçici verileri silme

## 4.2 Cihaz ID ile Reconnect

- Her cihaza uygulama içinde kalıcı bir deviceId üretilir
- Oyuncu odaya deviceId + oda numarası ile bağlanır
- Aynı cihaz tekrar aynı odaya girerse eski oyuncu kaydı bulunur
- Rol, canlı/ölü durumu, socket bağlantısı ve oyun state'i korunur
- Aynı deviceId ile ikinci aktif bağlantı gelirse eski socket düşürülür veya yeni socket ile güncellenir

## 4.3 Rol Dağıtımı

Rol dağıtımı sistem tarafından otomatik ve rastgele yapılır.

İlk MVP rolleri:

- Köylü
- Vampir
- Dedektif
- Doktor

Rol dağıtımında oyuncu sayısına göre otomatik denge kurulmalıdır.

Kesinleşmiş başlangıç rol dağılımı:

| Oyuncu Sayısı | Vampir | Dedektif | Doktor | Köylü |
|---:|---:|---:|---:|---:|
| 4 | 1 | 0 | 0 | 3 |
| 5-6 | 1 | 1 | 1 | Kalan |
| 7-9 | 2 | 1 | 1 | Kalan |
| 10-13 | 3 | 1 | 1 | Kalan |
| 14-17 | 4 | 1 | 1 | Kalan |
| 18-20 | 5 | 1 | 1 | Kalan |

4 kişilik oyunda Dedektif ve Doktor olmayacaktır. Bunun sebebi küçük oyuncu sayısında bilgi ve koruma rollerinin oyunu aşırı hızlı çözmesidir.

## 4.4 Otomatik Oyun Moderatörü

Oyun sahibi/moderatör olmayacaktır. Backend oyunu otomatik ilerletir.

Otomatik yönetilecek süreçler:

- Rol gösterim süresi
- Gece başlangıcı
- Vampirlerin uyanma sırası
- Vampir hedef seçimi
- Dedektif sorgulama sırası
- Doktor koruma sırası
- Gece sonucu hesaplama
- Gündüz tartışma süresi
- Gündüz oylama
- Oylama sonucu
- Kazanma koşulu kontrolü
- Yeni tur başlangıcı

## 4.5 Oyun Fazları

Başlangıç fazları:

1. Lobby
2. RoleReveal
3. NightStart
4. VampiresWake
5. VampireVote
6. DetectiveWake
7. DetectiveInspect
8. DoctorWake
9. DoctorProtect
10. NightResolve
11. DayStart
12. DayDiscussion
13. DayVote
14. ExecutionResolve
15. WinCheck
16. GameOver

## 4.6 Rol Aksiyonları

### Vampir

- Gece uyanır
- Yaşayan oyuncular arasından hedef seçer
- Birden fazla vampir varsa hedef çoğunluk oyu ile belirlenir
- Vampir oylarında eşitlik olursa eşit hedefler arasından rastgele seçim yapılır
- Süre biter ve hiçbir vampir seçim yapmazsa yaşayan köylü tarafı oyuncular arasından rastgele hedef seçilir

### Dedektif

- Her gece bir oyuncuyu sorgulayabilir
- Sorguladığı oyuncu için yalnızca “Vampir” veya “Vampir değil” sonucunu görür
- Tam rol bilgisi gösterilmez
- Her tur yalnızca 1 sorgu hakkı vardır
- Süre içinde seçim yapmazsa hakkı yanar

### Doktor

- Her gece bir oyuncuyu koruyabilir
- Korunan oyuncu vampir hedefiyse ölmez
- Kendini koruyabilir
- Art arda iki gece kendini koruyamaz
- Süre içinde seçim yapmazsa o gece kimse korunmaz

### Köylü

- Gece aksiyonu yoktur
- Gündüz tartışma ve oylamaya katılır

## 4.7 Oylama Sistemi

- Gündüz oylama ekranı açılır
- Canlı oyuncular oy kullanabilir
- Ölü oyuncular oy kullanamaz
- En çok oy alan oyuncu elenir
- Beraberlik olursa tekrar konuşma evresi başlatılır
- Aynı gündüz turunda beraberlik en fazla 1 kere tekrar edebilir
- İkinci oylamada da beraberlik olursa kimse elenmez ve oyun gece fazına geçer

## 4.8 Kazanma Koşulları

Başlangıç kazanma mantığı:

- Vampir sayısı yaşayan köylü takımı sayısına eşit veya fazlaysa vampirler kazanır
- Tüm vampirler elenirse köylüler kazanır

## 4.9 UI / Animasyon Features

- Kart oyunu tarzı ana tema
- Rol kartı açılma animasyonu
- Gece/gündüz geçiş animasyonu
- Geri sayım animasyonu
- Faz başlığı animasyonu
- Oyuncu seçme feedback animasyonu
- Sonuç ekranı animasyonu
- Basit ses efektleri opsiyonel

## 4.10 Dil

- İlk sürüm sadece Türkçe
- Metinler ileride çoklu dil desteği için ayrı dosyalarda tutulmalı

---

## 5. Architecture Decisions and Rules

## 5.1 Genel Mimari Kurallar

1. Oyun sonucu client tarafında hesaplanmaz.
2. Rol dağıtımı sadece server tarafında yapılır.
3. Rol bilgisi sadece ilgili oyuncuya gönderilir.
4. Socket eventleri typed olmalıdır.
5. Oyun fazları dağınık if/else yapısıyla değil, state machine mantığıyla yönetilmelidir.
6. Oyun state'i tek bir merkezi kaynakta tutulmalıdır.
7. Client, server state'inin görsel temsilidir.
8. Oda kapandıktan sonra oda verisi saklanmaz.
9. Kullanıcı hesabı yoktur; kimlik deviceId + roomCode + playerSession üzerinden yönetilir.
10. Oyun otomatik ilerlemelidir; host/moderatör bağımlılığı olmamalıdır.

## 5.2 Socket Kuralları

- Her socket bağlantısı deviceId ile doğrulanır
- Her oyuncu sadece kendi odasına ait eventleri alır
- Private rol eventleri sadece ilgili socket'e gönderilir
- Oda genel eventleri room broadcast ile gönderilir
- Bağlantı kopunca oyuncu hemen silinmez
- Reconnect için belirli süre tanınır
- Aynı deviceId tekrar bağlanırsa player session güncellenir

## 5.3 Timer Kuralları

- Geri sayımlar client tarafında görsel olarak akar
- Asıl süre ve faz geçişi server tarafından belirlenir
- Client timer sonucu server kararının yerine geçmez
- Server her faz için `phaseEndsAt` göndermelidir
- Client bu timestamp'e göre geri sayım gösterir

## 5.4 Game Engine Kuralları

Oyun motoru şu sorulara cevap verebilmelidir:

- Şu an hangi fazdayız?
- Bu fazda hangi roller aktif?
- Hangi oyuncular aksiyon yapabilir?
- Aksiyon geçerli mi?
- Faz ne zaman bitecek?
- Faz bitince hangi sonuç hesaplanacak?
- Bir sonraki faz ne?
- Kazanan var mı?

## 5.5 Reconnect Kuralları

Reconnect mantığı MVP için kritik özelliklerden biridir.

- DeviceId uygulama ilk açıldığında üretilir
- DeviceId local storage'da saklanır
- Odaya katılımda deviceId backend'e gönderilir
- Backend oda içinde bu deviceId'ye ait oyuncu var mı kontrol eder
- Varsa yeni socket bağlantısı eski oyuncu kaydına bağlanır
- Yoksa yeni oyuncu oluşturulur
- Oyuncu oyundayken bağlantısı koparsa state'i korunur

## 5.6 Güvenlik Kuralları

- Oda kodları tahmin edilmesi zor olmalı
- Her oda için geçici roomSecret üretilebilir
- Her oyuncu için playerSessionToken üretilebilir
- Client rolünü değiştiremez
- Client başka oyuncu adına aksiyon gönderemez
- Backend her aksiyonda oyuncu, oda, faz ve rol doğrulaması yapar
- Oyun başladıktan sonra rol dağıtımı değişmez

## 5.7 Maliyet Kuralları

- Başlangıçta tek backend instance yeterli olmalı
- Redis ilk MVP için zorunlu olmamalı
- PostgreSQL ilk MVP için zorunlu olmamalı
- Oda verileri memory'de tutulabilir
- Oda kapanınca veri silinmeli
- Mağaza yayınına yaklaşırken Redis değerlendirilmelidir

## 5.8 Oda Silme Kuralları

- Oda verisi kalıcı tutulmaz
- Oda içindeki tüm oyuncular çıkarsa oda hemen silinir
- Oda silindiğinde oyuncu sessionları, roller, oyun state'i ve tur bilgileri temizlenir
- GameOver sonrası oyuncular odada kalmaya devam ederse oda açık kalabilir
- GameOver sonrası tüm oyuncular çıkarsa oda hemen silinir

---

## 6. Implementation Phases

## Faz 1 — Proje Kurulumu

- Monorepo kurulumu
- Mobile app kurulumu
- Server app kurulumu
- Shared package kurulumu
- TypeScript config
- ESLint/Prettier
- Basit health endpoint
- Mobil uygulamadan backend bağlantı testi

Çıktı:

- Mobil uygulama açılır
- Backend çalışır
- App backend health endpointini görebilir

## Faz 2 — Socket ve Oda Prototipi

- Socket.IO server kurulumu
- Mobil socket client kurulumu
- DeviceId üretimi
- Oda oluşturma
- Oda numarası ile katılma
- Oyuncu listesi senkronizasyonu
- Oda doluluk kontrolü
- Reconnect başlangıç mantığı

Çıktı:

- Birden fazla telefon aynı odaya bağlanır
- Oyuncu listesi realtime güncellenir
- Uygulamayı kapatıp açan oyuncu aynı odaya dönebilir

## Faz 3 — Oyun State Machine

- GameRoom modeli
- Player modeli
- Role modeli
- Phase modeli
- GameEngine yapısı
- Faz geçişleri
- Server timer sistemi
- RoleReveal fazı

Çıktı:

- Oyun otomatik başlar
- Roller atanır
- Her oyuncu kendi rolünü görür
- Fazlar server tarafından ilerler

## Faz 4 — İlk Roller ve Gece Akışı

- Vampir aksiyonu
- Dedektif aksiyonu
- Doktor aksiyonu
- Gece sonucu hesaplama
- Ölen oyuncunun belirlenmesi
- Koruma mantığı
- Role özel private eventler

Çıktı:

- Gece turu oynanabilir hale gelir

## Faz 5 — Gündüz ve Oylama

- Gündüz tartışma süresi
- Oylama ekranı
- Oy verme
- Oylama sonucu hesaplama
- Oyuncu eleme
- Beraberlik kuralı

Çıktı:

- Gece + gündüz tam tur oynanabilir

## Faz 6 — Kazanma Koşulları ve Oyun Sonu

- Vampir kazanma kontrolü
- Köylü kazanma kontrolü
- GameOver ekranı
- Kazanan takım animasyonu
- Yeni oyun / odayı kapat akışı

Çıktı:

- Oyun baştan sona bitirilebilir

## Faz 7 — UI/UX ve Animasyon

- Kart oyunu teması
- Rol kartı animasyonu
- Faz geçiş animasyonları
- Geri sayım componenti
- Oyuncu seçme animasyonu
- Gece/gündüz renkleri
- Hata ve loading durumları

Çıktı:

- Oyun prototipten mağaza adayına yaklaşır

## Faz 8 — Stabilizasyon

- Reconnect iyileştirme
- Socket kopma durumları
- Aynı cihazdan çift bağlantı kontrolü
- Oda cleanup
- Server crash senaryoları
- Testler
- Loglama

Çıktı:

- Küçük gruplarla gerçek test yapılabilir

## Faz 9 — Yayın Hazırlığı

- Android app icon
- iOS app icon
- Splash screen
- Privacy policy
- Store açıklamaları
- EAS build
- Android internal test
- TestFlight
- Crash log kontrolü
- Production release hazırlığı

Çıktı:

- Android ve iOS mağaza yayınına hazır uygulama

---

## 7. Environment Variables

## 7.1 Server `.env`

```env
NODE_ENV=development
PORT=3000

APP_NAME=vampir-koylu-server
APP_VERSION=0.1.0

CORS_ORIGIN=http://localhost:8081

SOCKET_PATH=/socket.io
SOCKET_PING_TIMEOUT_MS=20000
SOCKET_PING_INTERVAL_MS=25000

ROOM_CODE_LENGTH=6
ROOM_MIN_PLAYERS=4
ROOM_MAX_PLAYERS=20
ROOM_IDLE_TTL_SECONDS=1800
ROOM_AFTER_GAME_TTL_SECONDS=300

ROLE_REVEAL_SECONDS=10
NIGHT_INTRO_SECONDS=5
VAMPIRE_ACTION_SECONDS=30
DETECTIVE_ACTION_SECONDS=20
DOCTOR_ACTION_SECONDS=20
DAY_DISCUSSION_SECONDS=120
DAY_VOTE_SECONDS=45
RESULT_SCREEN_SECONDS=10

ENABLE_REDIS=false
REDIS_URL=

ENABLE_DATABASE=false
DATABASE_URL=

LOG_LEVEL=debug
```

## 7.2 Mobile `.env`

```env
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
EXPO_PUBLIC_SOCKET_PATH=/socket.io

EXPO_PUBLIC_ROOM_CODE_LENGTH=6
EXPO_PUBLIC_MIN_PLAYERS=4
EXPO_PUBLIC_MAX_PLAYERS=20
```

## 7.3 Production Örneği

```env
NODE_ENV=production
PORT=3000

CORS_ORIGIN=https://vampirkoylu.app
SOCKET_PATH=/socket.io

ROOM_CODE_LENGTH=6
ROOM_MIN_PLAYERS=4
ROOM_MAX_PLAYERS=20
ROOM_IDLE_TTL_SECONDS=1800
ROOM_AFTER_GAME_TTL_SECONDS=300

ENABLE_REDIS=true
REDIS_URL=redis://username:password@host:6379

LOG_LEVEL=info
```

---

## 8. Kesinleşmiş Oyun Kuralları

Bu bölüm, kodlama sırasında referans alınacak kesin MVP oyun kurallarını içerir.

## 8.1 Oyuncu Sayısı

- Minimum oyuncu: 4
- Maksimum oyuncu: 20

## 8.2 4 Oyunculu Oyun

4 oyunculu oyunda roller:

- 1 Vampir
- 3 Köylü

4 kişilik oyunda Dedektif ve Doktor bulunmaz.

## 8.3 Vampir Hedef Seçimi

- Birden fazla vampir varsa hedef çoğunluk oyu ile belirlenir
- Eşitlik varsa eşit hedefler arasından rastgele seçim yapılır
- Hiçbir vampir seçim yapmazsa yaşayan köylü tarafı oyuncular arasından rastgele hedef seçilir

## 8.4 Dedektif Kuralı

- Dedektif her gece 1 oyuncu sorgular
- Sonuç yalnızca “Vampir” veya “Vampir değil” olarak gösterilir
- Tam rol bilgisi gösterilmez
- Süre dolarsa sorgu hakkı yanar

## 8.5 Doktor Kuralı

- Doktor her gece 1 oyuncuyu korur
- Kendini koruyabilir
- Art arda iki gece kendini koruyamaz
- Süre dolarsa kimse korunmaz

## 8.6 Gündüz Oylama Beraberliği

- İlk oylamada beraberlik olursa tekrar konuşma evresi başlatılır
- Aynı gündüz turunda beraberlik için yalnızca 1 tekrar hakkı vardır
- İkinci oylamada da beraberlik olursa kimse elenmez
- Kimse elenmezse oyun gece fazına geçer

## 8.7 Oda Silme

- Tüm oyuncular odadan çıkarsa oda hemen silinir
- Oda kapandığında oyun verisi saklanmaz
- Oda geçmişi, roller ve tur kayıtları kalıcı tutulmaz

## 8.8 Henüz Karar Verilmemiş Küçük Detaylar

Aşağıdaki detaylar ileride UI/UX aşamasında netleştirilebilir:

1. Rol kartlarının görsel dili
2. Kullanılacak ses efektleri
3. Geri sayım sürelerinin final değerleri
4. Kart animasyonlarının tasarım stili
5. App Store / Play Store açıklama dili

