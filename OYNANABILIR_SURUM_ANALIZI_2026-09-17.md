# Vampir Köylü — oynanabilir sürüm analizi

## Kod düzeltmeleri sonrası durum — 17 Eylül 2026

Aşağıdaki ilk analiz tarihsel bulgulardır. Kullanıcının düzeltme talebi üzerine şu işler tamamlandı:

- Tüm oda komutlarında token + aktif socket doğrulaması; token olmadan yeniden katılım reddi; kriptografik token üretimi. Yeniden katılım yanıtı kaybolsa bile aynı token geçerli kalır.
- Gerçek oda TTL'si, host bağlantısı kopunca bağlı insana anında devir, tek socket/tek oda ve tek oyuncu kuralı.
- Lobiden bilinçli ayrılanların kaldırılması; yalnızca bağlı insanlar ve botlarla oyun başlatma. Oyun içi ayrılmada aynı cihazdan dönüş için oda bazlı oturum saklama.
- Mobilde yeniden katılım onaylanmadan eski komutların gönderilmemesi; arka plandan dönüşte state yenileme; silinmiş odanın tüm istemci state'inin temizlenmesi.
- Açılışta navigasyon hazır olduktan sonra oyun ekranına dönüş; eski faz ekranlarının geri tuşuyla açılmaması; font yükleme hatasında sonsuz açılış ekranının önlenmesi.
- Dedektif hedefi yalnızca sonuç üretildiğinde geçmişe kaydediliyor. Hedef değiştirmek boşa geçmiş kaydı oluşturmuyor. Sonuç geçmişi yalnızca ilgili oyuncuya yeniden bağlanmada gönderiliyor.
- Oda/bağlantı kotaları, reconnect sonrasında korunan IP event limiti, 64 KB WebSocket mesaj sınırı; istemciye iç hata ayrıntıları yerine sabit hata kodları.
- Kare ikon, güvenli alanlı Android adaptive icon; Expo development client, build-properties ve system-ui bağımlılıkları; preview URL doğrulaması; Android APK/AAB profilleri; test LAN HTTP izinleri ve production'da açıkça kapatılması.
- Temiz npm/EAS kurulumunda shared paketinin otomatik derlenmesi; `npm run check` ve `npm run start:server` komutları; README'de kurulum akışı.
- Kullanılmayan font ağırlıkları paketten çıkarıldı (export asset kayıt sayısı 70 → 55). Uzak log kuyruğu sınırlandı ve istek zaman aşımı eklendi.

Doğrulama: `npm run check` başarılı; 24 dosyada **152 test** geçti. Testler beş oyunculu maç, rol gizliliği, dedektif sonucu geri yükleme, host devri ve ikinci maç başlatmayı içeriyor. Ayrıca localhost üzerinde gerçek WebSocket istemcileriyle create → bot doldur → ready → start → disconnect → rejoin akışı geçti. Android/iOS Hermes export ve geçici kopyada her iki platform için native prebuild başarılı; preview/production ağ izinleri üretilen manifest/plist üzerinden doğrulandı.

Kalan dış doğrulamalar: gerçek EAS proje/Apple imzalama hesabıyla APK/IPA üretimi, fiziksel cihazda ekran/performans ve ağ testleri, kalıcı sunucu adresi ve mağaza beyanları. Bu tur imzalı APK/IPA üretilmedi. “Hatasız” garantisi verilmez; kanıtlanan kapsam yukarıdadır. Sunucu hâlâ tek instance/bellek içi; restart aktif odaları sıfırlar. İnsan sohbeti/ses sistemi ve mağazaya yayın bu değişikliklerin kapsamı değildir.

---

Tarih: 17 Eylül 2026. İnceleme mevcut çalışma ağacına göre yapıldı. Önceden bulunan değişiklikler korunmuştur; bu incelemede uygulama kodu değiştirilmedi.

## Sonuç

Oyun motoru, rol dağıtımı, gece/gündüz akışı, oylama, botlar, oyun sonu ve mobil ekranların temel yapısı mevcut. Baştan yazım gerekmiyor. Ancak yalnızca görsel rötuş kalmış bir sürüm değil: oda yaşam döngüsü ve oturum doğrulaması önce düzeltilmeli. Önceki YAYIN_ONCESI_KONTROL_RAPORU.md dosyasının “kalan bloklayıcılar koddan çok operasyonel” sonucu mevcut kod için yeterli değil.

Bu çalışma kaynak kodu, derleme, mevcut testler, paketleme ve belirli hata senaryolarını kapsar; fiziksel cihazda görsel/etkileşimli tam oyun QA'sı değildir.

## Yapılan doğrulamalar

| Kontrol | Sonuç |
|---|---|
| `npm run build:server` | Shared ve sunucu derlemesi geçti |
| `npm run test -w apps/server` | 22 dosya, 143 test geçti |
| `npx tsc --noEmit -p apps/mobile/tsconfig.json` | Geçti |
| Mobil dizininde `npx expo export --platform all --output-dir /private/tmp/vampir-audit-export` | iOS ve Android Hermes paketleri oluştu |
| Oturumsuz yeniden katılma | Mevcut oyuncu kimliğiyle, token vermeden katılım kabul edildi |
| Son insan bağlantısının kopması | `cleanupRooms()` odanın hemen silindiğini doğruladı |
| Lobiden ayrılmış oyuncuyla başlatma | Ayrılan oyuncu bağlı olmadığı halde canlı rol aldı |
| Başka socket üzerinden host ayarı | Sahte socket test düzeneğinde host deviceId'siyle FastParty ayarı kabul edildi |

Son dört kontrol yerel derlenmiş sınıflar üzerinde çalıştırıldı; dış sistemlere istek/istismar yapılmadı. Mevcut testler bu hataları yakalamıyor. Export başarısı imzalı native derleme veya telefonda çalışabilirlik kanıtı değildir.

## Öncelikli bulgular

### 1. P0 — Oturum ve yetki kontrolü eksik

Kaynak: `apps/server/src/rooms/room-manager.ts:68`, `apps/server/src/socket/socket-runtime.ts:244` ve devamındaki yönetim handler'ları.

Mevcut oyuncuya yeniden katılırken token yalnızca gönderilirse kontrol ediliyor. Token gönderilmezse deviceId eşleşmesi yeterli. Hazır olma, ayrılma, ayar değiştirme, başlatma, duraklatma ve bot yönetimi gibi komutlarda gönderen socket çoğunlukla doğrulanmıyor. Oyun aksiyonlarında socket kontrolü var; tüm komutlara yayılmamış.

Etki: Oda kodunu ve oyuncunun deviceId'sini bilen bir istemci o oyuncu gibi davranabilir. deviceId normal oda snapshot'ında yayınlanmıyor; bu bir ön koşul, açığın yokluğu değil. CORS bu doğrulamanın yerini tutmaz.

Düzeltme: Yeniden katılım için geçerli token zorunlu olsun. Oda komutlarında oyuncu, oda, aktif socket ve oturum ortak doğrulamadan geçsin. Token yenileme ile mobilde saklama sırası birlikte ele alınmalı.

Kabul: Eksik/yanlış token ve başka socket reddedilir; gerçek oyuncu bağlantı kesilmesinden sonra sorunsuz geri döner. Oyun rolü başka bağlantıya sızmaz.

### 2. P1 — Son gerçek oyuncu kopunca oda anında siliniyor

Kaynak: `apps/server/src/rooms/room-manager.ts:266–291`.

Tüm insanlar bağlantısız olduğunda `cleanupAt = Date.now()` atanıyor. Sunucu 500 ms aralıkla temizlik yaptığı için tek kişi + bot oyunu kısa bir bağlantı kesintisinde kaybolabiliyor. Tanımlı 1800/300 saniyelik TTL bu yolu korumuyor.

Düzeltme: Son insan ayrıldığında gerçek bekleme süresi tanımlansın; yeniden bağlanmada iptal edilsin. Kullanıcının bilinçli oda kapatması ayrı karar olsun.

Kabul: Tek insan + botlarla oyunda 30 saniyelik bağlantı kesintisinden sonra aynı oyun geri gelir; bekleme süresi dolunca oda temizlenir.

### 3. P1 — Ayrılan oyuncular oyun kadrosunda kalıyor

Kaynak: `apps/server/src/rooms/room-manager.ts:96`, `apps/server/src/game/game-engine.ts:21`.

Leave yalnızca bağlantıyı kapalı işaretliyor. Minimum oyuncu sayısı ve rol dağıtımı bütün `room.players` üzerinden yapılıyor. Ayrılan kişi sayıyı doldurabiliyor ve kritik bir rolü alabiliyor.

Düzeltme: Lobide bilinçli ayrılma ile geçici kopma ayrılmalı. Başlangıçta geçerli oyuncu kadrosu doğrulanmalı; ayrılmış oyuncular kadrodan çıkarılmalı. Oyun içi kopmada rolü hemen silmek yerine geri dönüş politikası uygulanmalı.

Kabul: Dört kişiden biri lobiden ayrıldığında üç kişiyle yanlışlıkla dört kişilik oyun başlamaz; eksik kişi botla tamamlanabilir.

### 4. P1 — Host ayrılırsa oda yönetimi sahipsiz kalıyor

Kaynak: `apps/server/src/rooms/room-manager.ts:96–119,234`.

Host devri yok; host bağlı değilse yönetim komutları reddediliyor. Diğer insanlar bağlı kaldığında oda da temizlenmiyor. Lobide başlatma, manuel faz ilerletme ve duraklatılmış oyunu devam ettirme etkilenebilir.

Düzeltme: Bilinçli ayrılmada bağlı bir insana host devri; geçici kopmada kısa bekleme ve ardından devir. Alternatif olarak oda açıkça kapatılmalı ve herkes bilgilendirilmeli.

Kabul: Host çıkar, kalan oyuncu başlayabilir; host kopar/geri gelir, iki ayrı host oluşmaz.

### 5. P1 — Bir socket birden fazla oda biriktirebiliyor

Kaynak: `apps/server/src/socket/socket-runtime.ts:178–241`, `apps/server/src/rooms/room-manager.ts:108`.

Create/join önceki oda üyeliğini bırakmıyor. Tekrarlanan create/join mesajları bir socket'i birden fazla odada tutabilir; disconnect yalnızca ilk eşleşen odayı güncelliyor. Bu eski odalarda hayalet bağlı oyunculara ve karışık state yayınlarına yol açabilir. Bu bulgu kaynak kodu incelemesine dayanır.

Düzeltme: Bir bağlantı için tek aktif oda kuralı; tekrarlı create koruması; oda değişiminde sunucu üyeliği ve oyuncu kaydının tutarlı temizliği.

### 6. P1 — Paketleme ayarları tamamlanmamış

Kaynak: `apps/mobile/app.config.js`, `apps/mobile/eas.json`, `apps/mobile/src/config/env.ts`.

- Icon ve adaptive icon olarak kullanılan kart görseli 1024×1536; kare değil. Ayrı 1024×1024 uygulama ikonu hazırlanmalı. [Expo ikon gereksinimi](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/).
- Preview profilinde socket URL build sırasında zorunlu değil; release uygulaması URL yoksa modül yüklenirken hata fırlatıyor. Preview da build öncesinde doğrulanmalı.
- Development profili `developmentClient: true`, fakat package.json'da `expo-dev-client` yok. Bu profil kullanılacaksa kurulum tamamlanmalı; ilk bağımsız test için preview daha uygun.
- Gerçek EAS proje bağlantısı, uygulama kimlikleri, imzalama ve erişilebilir backend ile native build alınmalı. Bunların dış hesap durumları bu incelemede doğrulanmadı.
- HTTP LAN adresinin Expo Go'da çalışması, native release'te Android cleartext/iOS ağ politikalarının izin vereceğini kanıtlamaz. LAN test profili ayrı doğrulanmalı veya HTTPS kullanılmalı.

## Oynanış kapsamı

Oyun motorunda özel roller, mayor/lovers mekanikleri, beraberlik, ölüm zinciri ve bot senaryoları için testler var. Bu iyi bir temel. İstemci uçtan uca ve Socket.IO bağlantı yaşam döngüsü testleri eksik.

Mevcut socket protokolünde insanlara ait metin sohbeti veya sesli görüşme yok; bot konuşmaları var. Aynı ortamda konuşarak oynanacak parti oyunu için bu yeterli olabilir. Farklı evlerden bağımsız online oyun hedefleniyorsa oyuncular harici sesli görüşme kullanmalı veya ayrı iletişim özelliği planlanmalı. İlk sürüm için aynı ortam/harici görüşme kapsamını açıklamak en küçük çözüm.

## Performans ve yayın hazırlığı

- Kaynak asset klasörü yaklaşık 75 MB. Exportta 70 asset kaydı var; tekil arka planlar yaklaşık 1.9–2.6 MB. Bu 75 MB'nin tamamının uygulamaya girdiği anlamına gelmez. Son APK/IPA boyutu ölçülmeli.
- Export kullanılmayan font ağırlıklarını da içeriyor; gerçekten kullanılan ağırlıkların doğrudan importları ve büyük PNG optimizasyonu sonraki iyileştirme olabilir.
- Küçük ekran, Android geri tuşu, font ölçekleme, uygulama arka planı, klavye ve üst üste gelen geçişler gerçek cihazda görülmeli. Kaynak incelemesi FPS ölçümü değildir.
- Public sunucu öncesinde oda/bağlantı kotası ve bağlantı yenileyerek aşılamayan rate limit gerekir. Şu an limit socket bazlı; tekrar bağlantıda sıfırlanıyor. Fastify bodyLimit WebSocket mesaj limitini belirlemez.
- Oyunlar bellekte; sunucu restartında kaybolur. İlk test sürümünde tek instance ve planlı restart yeterli olabilir. Şimdiden Redis/veritabanı eklemek zorunlu değil.
- Privacy policy, destek iletişimi, veri beyanları, yaş derecelendirmesi ve asset lisans kaydındaki belirsizlikler mağazadan önce tamamlanmalı.
- Bağımlılık güvenlik taraması, yük testi, native izin çıktıları ve crash takibi bu turda doğrulanmadı.

## Laptop sunucu planı

**İlk yerel test:** Laptop ve telefonlar aynı Wi-Fi üzerinde; sunucu zaten `0.0.0.0:3000` dinliyor. Mobil URL laptopun yerel IP'si olmalı. Telefonda localhost laptop anlamına gelmez. Sunucu için `npm run build:server`, ardından `npm run start -w apps/server` kullanılabilir; production NODE_ENV verilirse gerekli CORS env'i ayrıca sağlanmalı.

**Uzaktan kapalı test:** Laptopa ulaşan sabit HTTPS adresi, WebSocket destekleyen tünel veya ters proxy; uyku kapalı, güç ve internet sürekli açık, süreç yeniden başlatma ve health kontrolü. CGNAT varsa doğrudan port açmak yeterli olmayabilir. Test URL'si build'e gömüldüğünden adres değişirse yeni build gerekebilir.

**Mağaza sürümü:** Laptop teknik olarak mümkün ama uyku, elektrik ve ev interneti kesintileri tüm oyunları etkiler. Küçük, sürekli açık tek sunucu daha uygun olur. İlk testte laptop kullanıp kalıcı sunucuya geçmek için oyun motorunu yeniden yazmak gerekmez.

LLM gerekli değil: mevcut botlar model çağrıları kapalıyken de çalışabiliyor. İlk sürümde LLM/embedding maliyeti eklenmemeli.

## APK, IPA ve mağaza sırası

| Hedef | Paket / yöntem |
|---|---|
| Android telefonlara doğrudan test kurulumu | APK, EAS preview/internal |
| Google Play | Production AAB |
| iPhone doğrudan kapalı dağıtım | İmzalı IPA, kayıtlı cihazlarla ad hoc |
| iPhone beta dağıtımı | Production build → TestFlight |
| iOS Simulator | Simulator için ayrı .app build; normal telefon dağıtımı değil |

[Expo internal dağıtım](https://docs.expo.dev/build/internal-distribution/) ve [TestFlight](https://docs.expo.dev/submit/testflight/).

Ön koşullar tamamlanınca mobil dizininden `eas build --platform android --profile preview` ve `eas build --platform ios --profile preview` test dağıtımı için kullanılabilir. Production profili mağaza paketleri içindir. Bu komutlar bu incelemede çalıştırılmadı.

Test bitmeden mağaza konsollarına beta yüklemek mümkündür; halka açık yayın ayrı adımdır. 13 Kasım 2023 sonrasında açılmış kişisel Google Play hesaplarında production erişimi için en az 12 testçinin 14 gün kesintisiz katıldığı kapalı test şartı bulunuyor. Internal test bunun yerine geçmez. [Google koşulları](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB).

Apple, 28 Nisan 2026 itibarıyla App Store Connect yüklemelerinde Xcode 26+ ve iOS 26 SDK+ istiyor; EAS build ortamı buna göre doğrulanmalı. [Apple koşulları](https://developer.apple.com/news/upcoming-requirements/).

## Son rötuş aşamasına geçiş için iş sırası

1. Oturum doğrulama, oda TTL, lobby kadrosu, host devri ve tek aktif oda sorunlarını düzelt; bu davranışlara hedefli regresyon testleri ekle.
2. Preview URL doğrulaması, kare ikon, gerçek uygulama kimlikleri ve imzalamayı tamamla.
3. Laptop sunucuyla Android APK ve iPhone IPA/TestFlight kurulumu yap.
4. İki gerçek cihaz + botlarla tam maç ve tekrar maç oyna. Ayrı olarak en az dört insanla sosyal akışı dene.
5. Ağ kesintisi, 30 saniye arka plan, uygulamayı kapatıp açma, host ayrılması, tüm insanların kopması ve sunucu restartı senaryolarını geçir.
6. Temel ve gelişmiş rol presetlerinde rol gizliliğini, özel sonuçları, beraberlikleri ve oyun sonunu cihazda doğrula.
7. Bu eşik geçildikten sonra görsel kalite, ses, animasyon, metin ve performans rötuşlarına odaklan; mağaza beyanlarıyla kapalı test sürecini paralel yürüt.

Kabul ölçütü: Her iki platformda Expo Go/Metro olmadan açılan kurulu uygulama; iki cihazla tamamlanan ve yeniden başlatılan maç; bağlantı kesintisinden aynı odaya dönüş; host ayrıldığında kullanılabilir oda; yetkisiz komutların reddi. Bu koşullar sağlanmadan “sadece son rötuş kaldı” demek erken.
