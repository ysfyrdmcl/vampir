# Mobil akıcılık ve oyun güvenilirliği

20 Eylül 2026. Başlangıçtaki yerel kullanıcı değişiklikleri korundu. Bu rapor gerçek cihaz performans sertifikası veya mağaza yayını onayı değildir.

## Uygulanan düzeltmeler

- Açılıştaki sabit 2050 ms bekleme kaldırıldı; oturum verileri paralel okunuyor.
- Tekrarlanan dekoratif animasyonlar ekran odağına, uygulamanın ön planda olmasına ve sistemin Hareketi Azalt ayarına bağlandı. Reanimated döngüleri kapanırken iptal ediliyor; yerel arka plan döngüleri liste etkileşimlerini bekletmiyor.
- Görsel arka plan kullanılmadığında gereksiz ölçek döngüsü çalışmıyor. iOS blur önemli yüzeylerle sınırlandı, Android'deki gereksiz blur katmanları kaldırıldı. Oyuncu kartlarında yalnız değişen kartların yeniden çizilmesi sağlandı.
- Geri sayım görünmeyen/arka plandaki ekranlarda duruyor, geri dönüşte gerçek zamandan güncelleniyor; uyarı animasyonu her saniye yeniden başlamıyor. Duraklatma ve süre bitişi daha açık ifade ediliyor.
- Alt menü tekrarları mevcut ekrana dönüyor; günlük/ayarlardan çıkarken güncel oyun fazına geçiliyor.
- Ana menüye kısa oynanış özeti, oyuncu seçimlerine erişilebilir etiketler eklendi. Rol rehberindeki taslak/yanlış kurallar mevcut motorla eşleştirildi.
- Gece/gündüz kararları sunucunun ACK yanıtıyla doğrulanıyor. Ret, bağlantı kesilmesi, zaman aşımı ve eski yanıtlar sahte başarı veya yerel karar kilidi oluşturmuyor. Gönderim sırasında çift gönderim engelleniyor.
- Oylar faz bitene kadar değiştirilebildiğinden metinler gönderme/güncelleme davranışını açıklıyor. Doktor hedef listesi kendini ve art arda koruma kurallarını uyguluyor; koruma geçmişi yalnız ilgili oyuncuyla senkronlanıyor.
- Boş oy tekrar oylamasında geçerli aday olarak korunuyor; zorunlu aksiyonlar gerçek hedef listesini kullanıyor. Rastgele eşitlik çözümünde boş oy sahte infaza dönüşmüyor. Botlar aynı aday kuralına uyuyor.
- Geç ulaşan ilk tur oyu tekrar oylamada kabul edilmiyor; istemci ve sunucu oylama turunu eşleştiriyor.
- Not kayıtları oda bazında sıralanıyor; eski asenkron yanıt yeni yazıyı geri almıyor. Görünmeyen günlük kayıtları okundu saymıyor, 300 kayıt sınırında da yeni kayıtları işliyor.
- Davet metni yapıştırılırken oyun adının oda kodu sanılması düzeltildi; pano okunamazsa veya kod bulunamazsa açıklayıcı geri bildirim veriliyor.
- Onay penceresi ekran yüksekliği ve güvenli alt boşluğa uyarlanıp kaydırılabilir yapıldı; Hareketi Azalt ayarını izliyor. Fiziksel cihazda bu pencerenin yerleşimi henüz doğrulanmadı.
- Ana düğmelerin basılıyken devre dışı kalması veya ekranın gizlenmesi durumunda basma ölçeği sıfırlanıyor.

## Doğrulama

| Kontrol | Sonuç |
| --- | --- |
| `npm run check` | Shared/server build, mobil TypeScript, 26 dosyada 163 test geçti. |
| `git diff --check` | Geçti. |
| Expo üretim JS/Hermes export | Android ve iOS başarılı. İmzalı APK/IPA derlemesi değildir. |
| iOS | iPhone 17 Pro Max / iOS 26.4 / Expo Go 57.0.9: ana menü ve sunucu bağlantısı görüldü. |
| Android | Netisp_API_35 / Android 15 / Expo Go 57.0.9: bootstrap ve bağlantı logları görüldü; AndroidRuntime crash yok. |
| iOS native release | Xcode 27 ile ARM64 simülatör derlemesi başarılı. iPhone 17 Pro Max / iOS 26.4 üzerinde Metro olmadan ana ekran açıldı ve sunucuya bağlandı. |
| Android native release | ARM64 APK derlemesi başarılı; imza ve gömülü Hermes paketi doğrulandı. Android 15 emülatöründe Metro olmadan açıldı ve bağlandı; açılışta fatal/JS hatası görülmedi. |
| Release bağlantı kurtarma | Yerel sunucu durdurulunca her iki platform da bağlantı uyarısı gösterdi; yeniden başlatılınca müdahalesiz bağlandı ve uyarıyı kaldırdı. |
| Gerçek Socket.IO oturumları | Boş oy tekrar turu ilerledi; köylü ve vampir galibiyetleri, lobiye dönüş, tekrar maç, doktor yasak hedefinden yasal hedefe geçiş, host devri ve aynı oturumla yeniden bağlanma geçti. |

Socket kontrolleri yalnız `127.0.0.1:3001` üzerinde izole sunucu ve yeni test odaları kullandı. Bot AI/LLM bayrakları kapalıydı; harici model çağrısı yapılmadı. Önceki QA scriptleri geçici kopyalarda yeni `tieCountInRound` alanıyla çalıştırıldı. [Maç kanıtı](socket-matches.json) ve [ek kontroller](socket-extra.json) saklandı.

Balanced ve deceptive bot maçları tamamlandı. Çok hızlandırılmış ilk random bot denemesi istek sınırına takıldı (`RATE_LIMITED`); sunucu koruması değiştirilmedi. Normal istek temposuyla tekrarlanan random maç 4. turda hatasız tamamlandı: [tekrar kanıtı](socket-paced.json).

[iOS görünümü](ios-home.png) • [Android açılışı](android-startup.png). Android görüntüsünün alt kısmında Expo Go'nun ilk açılış geliştirici tanıtımı bulunur; iOS'taki mavi dişli de Expo geliştirme arayüzüdür.

Bağımsız release ekranları: [iOS](ios-release.png) • [Android](android-release.png). Sunucu kesintisi: [iOS](ios-release-disconnected.png) • [Android](android-release-disconnected.png). Otomatik toparlanma: [iOS](ios-release-reconnected.png) • [Android](android-release-reconnected.png).

Native derlemeler çalışma alanının geçici kopyasında üretildi; 217 mobil/shared kaynak dosyası asıllarıyla karşılaştırıldı ve fark bulunmadı. Android APK dahili test için debug sertifikasıyla imzalı, iOS çıktısı imzasız simülatör uygulamasıdır. İkisinde de yerel `http://127.0.0.1:3000` test adresi kullanılır; mağazaya veya gerçek kullanıcılara dağıtılacak paketler değildir. Derleme, paket özeti ve SHA-256 kanıtları [native-release.json](native-release.json) dosyasında. iOS açılışında native SVG olayları ve kullanılmayan arka plan delegate yöntemleri için uyarılar görüldü; incelenen çalışma günlüğünde fatal exception bulunmadı.

Android görüntüsündeki durum çubuğu ikonlarının kırpılması [sistem Ayarlar ekranında da](android-system-statusbar.png) aynı şekilde tekrarlandı; bu bulgu emülatör/SystemUI katmanına ait. Uygulama koduna buna yönelik geçici çözüm eklenmedi.

Mobil istemci ve sunucu bu sürümde birlikte güncellenmelidir: karar onayı ACK ve tekrar oylama bağlamı yeni sözleşmenin parçasıdır.

## Kalan cihaz doğrulaması

- Fiziksel Android/iPhone üzerinde release build ile tam dokunmatik maç ve tekrar maç.
- Hedef cihazlarda 60/120 Hz kare süreleri, kaydırma, uzun maçta bellek/ısı/pil ölçümü.
- Küçük ekran, büyük metin, ekran okuyucu, klavye, sistem Hareketi Azalt ve gerçek ağ değişiminde arka plan/ön plan akışları.

Mevcut otomasyon Device Hub erişiminde zaman aşımına uğradığı için iOS dokunmatik uçtan uca oynanış doğrulanamadı. Emülatör açılışı ve otomatik mantık testleri fiziksel cihaz performans ölçümünün yerine geçmez. Mağaza imzalama/yayın ve canlı sunucu değişikliği yapılmadı.

## Son tamamlanma denetimi

| Hedef | Mevcut kanıt | Açık kalan |
| --- | --- | --- |
| Android/iOS akıcılığı | Animasyon yaşam döngüsü ve çizim yükü düzeltmeleri; iki platformda native release açılışı | Fiziksel cihaz kare süreleri, uzun maç bellek/ısı/pil ölçümü |
| Oyun algoritmalarının güvenilirliği | 163 otomatik test ve gerçek Socket.IO maçları; bulunan kural/oylama hataları düzeltildi | Tüm oyun akışının cihazda dokunarak oynanması |
| Estetik ve mobil UX | Ana ekranın iki platformda görsel kontrolü; erişilebilir seçimler, açıklamalar, onay ve hata geri bildirimleri | Tüm ekranların küçük ekran/büyük metin/klavye/ekran okuyucu ile denetlenmesi |
| Tam mobil uygulama | Bağımsız paketler, yerel sunucuda kesinti ve otomatik toparlanma | Fiziksel cihazlarda release kullanım ve yaşam döngüsü testi |

Son cihaz sorgusunda fiziksel iPhone 17 Pro Max / iOS 27.0 eşleşmiş ve geliştirici modu açık olarak görüldü. Ancak `security find-identity -v -p codesigning` geçerli imzalama kimliği bulamadı. İlk uygulama sorguları `Failed to allocate RSD device` hatası verdi; doğrudan CoreDevice kimliğiyle tekrar sorgulama başarılı oldu ve yalnız Expo Go 57.0.9 bulundu, Vampir Köylü kurulumu bulunmadı. Device Hub arayüz erişimi yeniden zaman aşımına uğradı. `adb devices -l` boş: fiziksel Android bağlı değil. Bu nedenle fiziksel test için Android bağlantısı ve çalışır iOS test/imzalama erişimi gerekiyor. Bu denetimde yeni bir kaynak kod hatası saptanmadı; kapsamlı testler ve derlemeler gereksiz yere tekrarlanmadı.
