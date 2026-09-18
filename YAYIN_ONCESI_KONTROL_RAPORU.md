# Vampir Koylu - Yayin Oncesi Kontrol Raporu

Tarih: 2026-05-26  
Son guncelleme: 2026-05-26, kod duzeltmeleri sonrasi  
Kapsam: mobile/server/shared kaynak kodu, Expo/EAS config, env guard'lari, backend production hardening baslangici, asset kullanimi, derleme/test komutlari ve yayin oncesi kalan isler.

## 1. Kisa Sonuc

Kod tarafindaki ana P0 bloklayicilarin buyuk kismi giderildi. Proje artik onceki rapordaki haliyle yayina cikmasi kesinlikle sakincali olan `TEMP TEST` rol manipilasyonu, release build'de localhost socket fallback'i, eksik EAS profili ve public client log endpoint'i gibi riskleri tasimiyor.

Yine de proje henuz magaza yayini icin tamamen hazir degil. Kalan bloklayicilar koddan cok operasyonel ve magaza tarafinda:

- Canli HTTPS/WSS backend domain'i henuz tanimli ve test edilmis degil.
- Production `CORS_ORIGIN`, `EXPO_PUBLIC_SOCKET_URL`, `EAS_PROJECT_ID`, bundle/package id degerleri gercek yayin degerleriyle set edilmeli.
- EAS production `.ipa/.aab` build'i, TestFlight ve Play Internal Testing henuz yapilmadi.
- Privacy policy, support URL, App Privacy, Google Data Safety ve age rating formlari hazirlanmadi.
- Gercek cihaz performans ve tam oyun akisi QA'si tamamlanmadi.

## 2. Bu Turda Yapilan Degisiklikler

### Tamamlandi - P0 kod bloklayicilari

- `apps/server/src/game/game-engine.ts`
  - Host oyuncuyu zorla Vampir yapan `TEMP TEST` cagrisi ve helper tamamen kaldirildi.

- `apps/server/tests/phase-flow-skip.test.ts`
  - Oyun baslarken host'un zorla Vampir yapilmadigini dogrulayan regresyon testi eklendi.

- `apps/mobile/src/config/env.ts`
  - Release build'de `EXPO_PUBLIC_SOCKET_URL` yoksa uygulamanin `http://127.0.0.1:3000` fallback'ine dusmesi engellendi.
  - Development akisi icin Expo host/script host fallback'i korunuyor.

- `apps/mobile/app.config.js`
  - Eski statik `app.json` yerine dinamik config eklendi.
  - `ios.bundleIdentifier`, `ios.buildNumber`, `android.package`, `android.versionCode`, icon, adaptive icon, splash, platformlar ve `extra.eas.projectId` destegi eklendi.
  - Production profilinde `EAS_PROJECT_ID` ve `EXPO_PUBLIC_SOCKET_URL` zorunlu hale getirildi.
  - Production socket URL icin `https://` veya `wss://` guard'i eklendi.

- `apps/mobile/eas.json`
  - `development`, `preview`, `production` build profilleri ve `production` submit profili eklendi.

- `apps/server/src/config/env.ts`
  - Production'da `CORS_ORIGIN=*` kullanimi env parse asamasinda engellendi.
  - `CLIENT_LOGS_ENABLED`, `SOCKET_RATE_LIMIT_WINDOW_MS`, `SOCKET_RATE_LIMIT_MAX_EVENTS` env degerleri eklendi.

- `apps/server/src/app.ts`
  - Fastify body limit `64 KB` olarak ayarlandi.
  - `/client-logs` production'da default kapatildi; sadece `CLIENT_LOGS_ENABLED=true` ise aciliyor.

- `apps/server/src/socket/socket-runtime.ts`
  - Socket bazli basit event rate limit eklendi.
  - Limit asilirsa `RATE_LIMITED` hatasi donuyor.

- `apps/mobile/src/components/GameBackground.tsx`
  - Production ekran arka planlari `assets/references/*` yerine `assets/backgrounds/*` final klasorunden baglandi.

- Env ornekleri:
  - `apps/server/.env.example` yeni production hardening env'leriyle guncellendi.
  - `apps/mobile/.env.example` release build'de socket URL zorunlulugunu aciklayacak sekilde guncellendi.

## 3. Dogrulama Sonuclari

Calistirilan komutlar:

```bash
npm run build:shared
npm run build -w apps/server
npx tsc -p apps/mobile/tsconfig.json --noEmit
npm test -w apps/server
npx expo config --json
APP_ENV=production EAS_PROJECT_ID=00000000-0000-0000-0000-000000000000 EXPO_PUBLIC_SOCKET_URL=https://api.example.com npx expo config --json
```

Sonuc:

- Shared build: gecti.
- Server build: gecti.
- Mobile TypeScript check: gecti.
- Server testleri: 22 test dosyasi, 143 test gecti.
- Expo development resolved config: gecti.
- Expo production resolved config: gerekli env'ler verilince gecti.

Calistirilmayanlar:

- EAS production iOS/Android build.
- TestFlight / Play Internal Testing.
- Gercek cihaz FPS/memory profili.
- `npm audit` veya dependency vulnerability taramasi.
- Backend load test ve WebSocket reverse proxy testi.

## 4. Son Durum: Eski P0 Bulgulari

### P0 - TEMP TEST rol manipilasyonu

Durum: Tamamlandi.

Onceki risk:

- Host oyuncu oyun baslangicinda zorla Vampir yapiliyordu.

Uygulanan:

- `forceHostVampireForLocalTest` tamamen kaldirildi.
- Regresyon testi eklendi.

Kalan:

- Yok.

### P0 - Store config eksik

Durum: Kismen tamamlandi.

Uygulanan:

- `app.config.js` eklendi.
- iOS/Android identifier alanlari, build number/versionCode, icon/splash, adaptive icon ve EAS project id destegi eklendi.
- `eas.json` eklendi.

Kalan:

- `IOS_BUNDLE_IDENTIFIER`, `ANDROID_PACKAGE`, `EAS_PROJECT_ID`, `IOS_BUILD_NUMBER`, `ANDROID_VERSION_CODE` gercek magaza degerleriyle set edilmeli.
- Mevcut icon/splash teknik olarak config'i tamamliyor, fakat final store kalitesinde profesyonel app icon/splash tasarimi ayrica hazirlanmali.
- EAS production build uretilip App Store Connect / Play Console uzerinden dogrulanmali.

### P0 - Production socket URL local fallback'e dusuyor

Durum: Kod tarafinda tamamlandi.

Uygulanan:

- Release build'de `EXPO_PUBLIC_SOCKET_URL` zorunlu hale getirildi.
- Production Expo config tarafinda URL'nin `https://` veya `wss://` olmasi zorunlu hale getirildi.

Kalan:

- Gercek production backend URL belirlenmeli.
- Reverse proxy WebSocket upgrade ve `/socket.io` path'iyle test edilmeli.
- App Review sirasinda backend live kalmali.

### P0 - Backend production hardening eksik

Durum: Kismen tamamlandi.

Uygulanan:

- Production `CORS_ORIGIN=*` engellendi.
- `/client-logs` production'da default kapatildi.
- Fastify body limit eklendi.
- Socket bazli event rate limit eklendi.

Kalan:

- Production `CORS_ORIGIN` gercek domain/policy ile set edilmeli.
- Reverse proxy tarafinda body limit, idle timeout, WebSocket upgrade ve TLS ayarlari yapilmali.
- Rate limit su an in-memory ve socket bazli; cok instance icin Redis/sticky-session veya gateway seviyesi rate limit gerekir.
- Oyun odalari bellek ici kalmaya devam ediyor; server restart tum aktif odalari dusurur. MVP icin kabul edilecekse review/operasyon notlarina yazilmali, aksi halde kalici/shared room store gerekir.

## 5. Apple App Store ve Google Play Gereksinimleri

Hala yapilmasi gerekenler:

- Privacy policy URL hazirlanmali.
- Support/contact URL hazirlanmali.
- Apple App Privacy cevaplari doldurulmali.
- Google Play Data Safety formu doldurulmali.
- Age rating cevaplari dikkatli verilmeli; vampir, olum, karanlik tema ve olasi kan gorselleri dogru beyan edilmeli.
- Review notes hazirlanmali: realtime oda oyunu, backend URL, test odasi nasil olusturulur, botlarla tek kisilik test nasil yapilir.
- Backend review surecinde kesintisiz acik kalmali.

Veri notu:

- Uygulamada klasik e-posta/sifre hesabi yok.
- Device id, session token, room code, nickname ve oyuncu notlari kullaniliyor.
- Bunlar privacy policy ve Data Safety beyanlarina girmeli.
- Ileride hesap sistemi eklenirse account deletion yolu zorunlu hale gelir.

## 6. Android/iOS'ta Kalan Teknik Riskler

### Production backend ve network

- `transports: ["websocket"]` kullaniliyor; proxy/load balancer WebSocket upgrade desteklemelidir.
- Store build'de LAN, emulator veya localhost adresleri kullanilmamali.
- TLS sertifikasi, CDN/proxy timeout, idle WebSocket timeout ve reconnect davranisi gercek cihazda test edilmeli.

### Safe area ve ekran boyutlari

- `ScreenShell` merkezi safe area cozumunu kullaniyor, fakat RoleReveal, Lobby sticky CTA, bottom sheet, RoleGuide/RoleCard ve GameLog kucuk ekranlarda tekrar test edilmeli.
- Android edge-to-edge davranisi fiziksel cihazda kontrol edilmeli.

### Accessibility

- `apps/mobile/src/app/App.tsx` icinde global `allowFontScaling=false` kullaniliyor.
- Bu tasarimi sabit tutar, fakat erisilebilirlik acisindan riskli.
- En azindan kritik metinler ve form alanlari icin font scaling stratejisi belirlenmeli.

### Local storage ve privacy

- AsyncStorage'da device id, session token, room code, nickname ve oyuncu notlari tutuluyor.
- Privacy/Data Safety'de beyan edilmeli.
- Session token guvenlik beklentisi artarsa SecureStore gibi platform secure storage degerlendirilmeli.

### UGC/moderation riski

- Su an serbest public chat gorunmuyor.
- Nickname user-generated content sayilabilir.
- Nickname uzunluk/karakter kontrolu var, fakat kufur/abuse filtresi ve support/report akisi henuz yok.

## 7. Performans ve Paket Boyutu

### Asset boyutu

Onceki taramada `apps/mobile/src/assets` yaklasik 75 MB gorunuyordu.

Uygulanan:

- `assetBundlePatterns` artik `**/*` degil; final asset klasorleriyle daraltildi.
- `GameBackground` reference gorseller yerine `backgrounds` klasorunu kullaniyor.

Kalan:

- PNG'ler WebP veya daha dusuk boyutlu PNG olarak optimize edilmeli.
- Kullanilmayan buyuk assetler tespit edilip kaldirilmali.
- EAS production build sonrasi `.aab/.ipa` boyutu olculmeli.
- Orta segment Android cihazda image decode/cold start etkisi test edilmeli.

### Animasyon/render maliyeti

Kalan testler:

- Overlay gecislerinde FPS.
- GameLog 100+ kayit.
- BotSpeech sheet 20 kayit.
- Lobby 20 oyuncu/bot.
- RoleReveal ve GameOver animasyonlari.
- Low-end/reduced motion fallback ihtiyaci.

## 8. Production'a Cikmadan Once Yapilacak Minimum Isler

### Backend yayinlama

1. Production host sec: Fly.io, Render, Railway, AWS, GCP veya benzeri.
2. HTTPS domain bagla: `https://api.vampir...`
3. WebSocket upgrade destekli reverse proxy ayarla.
4. Production env set et:

```bash
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://gercek-domain
SOCKET_PATH=/socket.io
CLIENT_LOGS_ENABLED=false
SOCKET_RATE_LIMIT_WINDOW_MS=10000
SOCKET_RATE_LIMIT_MAX_EVENTS=80
BOT_AI_ENABLED=false
BOT_LLM_ENABLED=false
```

5. `/health` endpoint monitor et.
6. Log retention ve disk dolma riskini ayarla.
7. Tek instance MVP kararini yazili hale getir; cok instance icin sticky session/shared store planla.

### Mobile production build

1. Gercek EAS project id al ve env'e koy:

```bash
EAS_PROJECT_ID=...
```

2. Gercek bundle/package id degerlerini set et:

```bash
IOS_BUNDLE_IDENTIFIER=com.sirket.vampirkoylu
ANDROID_PACKAGE=com.sirket.vampirkoylu
```

3. Production backend URL set et:

```bash
EXPO_PUBLIC_SOCKET_URL=https://api.gercek-domain
EXPO_PUBLIC_SOCKET_PATH=/socket.io
```

4. iOS build number ve Android version code yayin stratejisini belirle.
5. Final icon/splash/screenshots hazirla.
6. EAS build calistir:

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

7. TestFlight ve Play Internal Testing ile cihaz smoke test yap.

## 9. Yayin Oncesi Checklist

### P0 - Yayin bloklayici

- [x] `TEMP TEST` host Vampire zorlamasi kaldirildi.
- [x] Host'un zorla Vampir yapilmadigini dogrulayan test eklendi.
- [x] `app.config.js` icine iOS/Android package identifier destegi eklendi.
- [x] `eas.json` production profili eklendi.
- [x] Production `EXPO_PUBLIC_SOCKET_URL` zorunlu hale getirildi.
- [x] `/client-logs` production'da default kapatildi.
- [x] Production `CORS_ORIGIN=*` engellendi.
- [x] Basit socket rate limit ve request body limit eklendi.
- [ ] Backend HTTPS/WSS domain uzerinden yayinda.
- [ ] Production `CORS_ORIGIN` gercek domain ile set edildi.
- [ ] App Review sirasinda backend live kalacak sekilde hazirlandi.
- [ ] Gercek `EAS_PROJECT_ID`, bundle id ve package id ayarlandi.
- [ ] Privacy policy ve support URL hazir.
- [ ] EAS production iOS/Android build basariyla alindi.

### P1 - Yuksek oncelik

- [ ] Gercek iPhone ve Android cihazda tam oyun akisi test edildi.
- [ ] TestFlight ve Play Internal Testing smoke testleri tamamlandi.
- [ ] Assetler optimize edildi, build boyutu olculdu.
- [ ] Store screenshots final UI ile alindi.
- [ ] App Privacy ve Google Data Safety formlari dolduruldu.
- [ ] Age rating cevaplari dogru verildi.
- [ ] Backend restart durumunda oda kaybi beklentisi kabul edildi veya kalici/shared store eklendi.
- [ ] WebSocket proxy timeout/reconnect davranisi test edildi.
- [ ] LLM/bot AI production icin default kapali veya rate/cost limitli tutuldu.

### P2 - Orta oncelik

- [ ] Mobile unit/e2e test altyapisi eklendi veya manuel QA matrisi imzali hale getirildi.
- [ ] Accessibility font scaling stratejisi belirlendi.
- [ ] Android hardware back davranisi test edildi.
- [ ] QR/camera ozelligi eklenecekse permission strings ve camera dependency dogru ayarlandi.
- [ ] Nickname abuse filtresi ve support/report yolu dusunuldu.
- [ ] Crash reporting ve production observability eklendi.

## 10. Onerilen QA Matrisi

Cihazlar:

- iPhone kucuk ekran: iPhone SE veya benzeri.
- iPhone modern: iPhone 14/15/16 ailesi.
- Android orta segment: 4-6 GB RAM, Android 13/14/15.
- Android yeni: Android 15/16, edge-to-edge davranisi.

Akislar:

- Ilk acilis, oda kurma, botla minimum oyuncu doldurma.
- Lobby ready/start.
- RoleReveal -> Night gecisi.
- Vampir aksiyonu, dedektif/doktor/gardiyan aksiyonlari.
- Day discussion, mayor election, vote, tie/revote.
- Hunter last breath.
- Lover chain death.
- GameLog genel/kisisel/not defteri.
- GameOver -> yeni oyun.
- GameOver -> ana menu.
- App background/foreground ve socket reconnect.
- Server restart sirasinda kullaniciya gosterilen hata.

Performans olcumleri:

- Overlay gecislerinde FPS.
- GameLog 100+ kayit.
- BotSpeech sheet 20 kayit.
- Lobby 20 oyuncu/bot.
- Background image memory ve cold start.

## 11. Sonraki En Mantikli Is Sirasi

1. Production backend domain ve reverse proxy kur.
2. Gercek `EXPO_PUBLIC_SOCKET_URL`, `CORS_ORIGIN`, `EAS_PROJECT_ID`, bundle id ve package id degerlerini set et.
3. EAS production iOS/Android build al.
4. TestFlight ve Play Internal Testing smoke test yap.
5. Privacy policy, support URL, App Privacy, Data Safety ve age rating formlarini tamamla.
6. Asset optimizasyonu ve gercek cihaz performans turunu yap.
7. Store screenshot ve review notes hazirla.

## 12. Resmi Kaynaklar

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple upcoming SDK minimum requirements: https://developer.apple.com/news/?id=ueeok6yw
- Apple App Store Connect app privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- Google Play target API requirement: https://developer.android.com/google/play/requirements/target-sdk
- Google Play Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- Expo SDK 54 reference: https://docs.expo.dev/versions/v54.0.0/
- Expo permissions guide: https://docs.expo.dev/guides/permissions/
