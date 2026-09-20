# Vampir Koylu

Monorepo:

- `apps/mobile`: Expo + React Native istemci
- `apps/server`: Fastify + Socket.IO backend
- `packages/shared`: Ortak tipler ve socket event isimleri

## Baslangic

```bash
npm install
```

Shared package build:

```bash
npm run build:shared
```

Backend server:

```bash
npm run dev:server
```

Mobil client (Expo Go SDK 57):

```bash
# iOS simulator icin
EXPO_PUBLIC_SOCKET_URL=http://127.0.0.1:3000 npm run dev:mobile -- --go

# Android emulator icin
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:3000 npm run dev:mobile -- --go
```

Fiziksel cihazla testte `EXPO_PUBLIC_SOCKET_URL` degerini backend'in LAN adresiyle ver:

```bash
EXPO_PUBLIC_SOCKET_URL=http://192.168.x.x:3000 npm run dev:mobile -- --go --lan
```

## Oynanabilir test sürümü

`npm install` ortak paketi de derler; temiz EAS build'lerinde yerel `dist` dosyalarına bağımlılık yoktur.

```bash
npm run check
npm run build:server
npm run start:server
```

Laptop ve telefonları aynı Wi-Fi ağına bağla. Laptopun uyumasını engelle ve güvenlik duvarında 3000 portuna yerel ağ erişimi ver. Sunucu `0.0.0.0:3000` dinler; telefon URL'sinde **laptopun LAN IP'sini** kullan. Sunucu yeniden başlarsa bellek içindeki odalar kaybolur.

Mobil build'den önce Expo/EAS hesabına giriş yap, `apps/mobile` dizininde EAS projesini bağla ve o profilin EAS ortamına `EXPO_PUBLIC_SOCKET_URL` tanımla. `.env.example` gerçek bağlantı ayarı değildir. Aynı adresin build ortamına aktarılması gerekir.

```bash
cd apps/mobile
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
```

- Preview Android: Metro gerektirmeyen APK. Preview iOS: kayıtlı cihazlar için imzalı ad hoc IPA; Apple imzalama hesabı gerekir.
- Preview için `http://LAPTOP_IP:3000` kullanılabilir. Bu profilin LAN HTTP izinleri native yapılandırmada açılır.
- Production için HTTPS/WSS adresi ve `EAS_PROJECT_ID` zorunludur. `IOS_BUNDLE_IDENTIFIER` ve `ANDROID_PACKAGE` mağaza kayıtlarınla eşleşmeli. Varsayılan kimlik `com.vampirkoylu.game`.
- `--profile production`: Android AAB ve iOS mağaza/TestFlight build'i. Production'da HTTP istisnası kapalıdır.
- Development profili Expo development client içerir ve Metro ile kullanılır; bağımsız test için preview seç.

Oda kur → botlarla minimum sayıyı doldur → hazır ol → başlat. İnsanlar aynı ortamda veya harici sesli görüşme üzerinden konuşabilir; uygulama içi insan sohbeti yoktur. LLM servisi botların temel çalışması için gerekli değildir.

Bağlantı koparsa oda TTL süresince korunur; host yetkisi varsa başka bağlı insana geçer. Lobide bilinçli ayrılan oyuncu kadrodan çıkarılır. Oyun sırasında ayrılan oyuncunun rolü korunur; aynı cihazdaki oda oturumu ile geri dönebilir. Yeni maça yalnızca bağlı oyuncular ve botlar alınır.

Test dağıtımından önce iki fiziksel cihazda tam maç, tekrar maç, arka plan/ön plan, ağ kesintisi ve host ayrılmasını doğrula. Otomatik testler bu cihaz kontrolünün yerine geçmez.
