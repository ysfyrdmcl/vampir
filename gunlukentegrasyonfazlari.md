# Günlük Entegrasyon Fazları

Bu plan `gunluk.md` temel alınarak hazırlanmıştır.
Amaç: Günlük ekranını debug log görünümünden çıkarıp, oyuncu odaklı ve role-gizlilik kurallarına uygun bir yapıya geçirmek.

## Faz 1 — Temizlik ve Event Sözlüğü

### Hedef
- Oyuncuya teknik event anahtarları (`test.*`, `emit.*`, `socket.*`) göstermemek.
- Üretim günlüğünü `oyun olayı` merkezli hale getirmek.

### Yapılacaklar
1. `apps/mobile/src/screens/GameLogScreen.tsx` içinde event render katmanını ikiye ayır.
2. `publicVisibleEvents` listesi oluştur: sadece oyuncunun görmesi gereken olaylar gösterilsin.
3. `debug/test` eventleri filtrele:
- `test.*`
- `sim.*`
- `emit.*`
- `socket.connect_error` gibi teknik olaylar (isteğe bağlı ayrı debug sekmesine taşınacak).
4. `toReadableText` yerine merkezi mapping tablosu (`eventDictionary`) oluştur.

### Entegrasyon Noktaları
- `apps/mobile/src/screens/GameLogScreen.tsx`
- `apps/mobile/src/logging/log-feed-store.ts`

### Çıktı
- Genel sekme artık sadece oyuncu diliyle konuşur.

---

## Faz 2 — Genel Günlük (Public Timeline) Yeniden Kurgusu

### Hedef
- Genel sekmede sadece herkesin ortak bildiği bilgiler görünsün.
- Faz akışı anlaşılır bir timeline kart yapısına dönüşsün.

### Yapılacaklar
1. `game.phase` eventlerini kullanıcı diliyle grupla:
- Gece başladı
- Gündüz başladı
- Oylama başladı
- Sonuç açıklandı
2. `summary.players_eliminated`, `summary.night_no_elimination` olaylarını kartlaştır.
3. `tie` ve `revote` akışlarını net yaz:
- Beraberlik oluştu
- İkinci oylama başladı
- Sonuç: kimse elenmedi / rastgele elendi
4. `revealEliminatedRole` kuralına göre rol metnini koşullu göster.

### Entegrasyon Noktaları
- `apps/mobile/src/screens/GameLogScreen.tsx`
- `apps/mobile/src/screens/NightScreen.tsx` (aynı metin standardı)
- `apps/mobile/src/store/game-store.ts` (`roomState.rules` referansı)

### Çıktı
- Oyuncu, oyunun gidişini teknik bilgi görmeden takip edebilir.

---

## Faz 3 — Kişisel Günlük (Role-Aware Private Feed)

### Hedef
- Kişisel sekme role göre anlamlı içerik versin.
- Gizli bilgilerin yalnızca ilgili oyuncuya görünmesi garanti edilsin.

### Yapılacaklar
1. `personal` scope eventlerini role bazında sınıflandır:
- Dedektif: sorgu geçmişi
- Doktor: koruma geçmişi
- Vampir: hedef ve sonuç geçmişi
- Aşıklar: partner bilgisi
- Avcı/Gardiyan: özel aksiyon kayıtları
2. `game.private_result.detective`, `game.private_result.vampire_preview`, `game.private_result.lover_link` olaylarını timeline satırlarına dönüştür.
3. Kişisel sekmede "Bu bilgiler sadece sende" uyarısını sabitle.

### Entegrasyon Noktaları
- `apps/mobile/src/screens/GameLogScreen.tsx`
- `apps/mobile/src/logging/game-logger.ts`
- `apps/mobile/src/socket/runtime.ts`

### Çıktı
- Oyuncu kendi rol kararlarını geçmişe bakarak stratejik yönetebilir.

---

## Faz 4 — Etiket ve Not Sistemi (Local Strategy Layer)

### Hedef
- Oyuncunun kendi analizini tutabilmesi.
- Oyun deneyimini sadece pasif log okumadan aktif stratejiye taşımak.

### Yapılacaklar
1. Kişisel sekmeye oyuncu etiketi sistemi ekle:
- Şüpheli
- Güvenilir
- Öncelikli hedef
- Not yok
2. Manuel not alanı ekle (oyuncu başına kısa not).
3. Etiketler ve notlar local storage'da oyuncu bazlı saklansın (`roomCode + playerId` anahtarı).

### Entegrasyon Noktaları
- `apps/mobile/src/screens/GameLogScreen.tsx`
- `apps/mobile/src/storage/*` (yeni not depolama util'i)

### Çıktı
- Günlük ekranı aynı zamanda karar destek ekranına dönüşür.

---

## Faz 5 — Oyun Sonu Analiz Günlüğü

### Hedef
- Oyun sonu ekranı ile günlük arasında bağ kurmak.
- "Ne oldu, neden oldu" sorusuna tatmin edici cevap üretmek.

### Yapılacaklar
1. `GameOver` anında özet paket oluştur:
- Kazanan taraf
- Kritik eleme anları
- Beraberlik sayısı
- Kilit gece olayları
2. Bu özeti günlükte "Oyun Sonu Analizi" bloğu olarak göster.
3. `revealEliminatedRole` ayarı kapalıysa oyun sırasında gizli kalan roller sadece oyun sonunda açığa alınsın (oyun tasarım kararıyla uyumluysa).

### Entegrasyon Noktaları
- `apps/mobile/src/screens/GameOverScreen.tsx`
- `apps/mobile/src/screens/GameLogScreen.tsx`
- `apps/server/src/socket/socket-runtime.ts` (gerekirse ek payload)

### Çıktı
- Oyun bittikten sonra oyuncular net bir analiz raporu görür.

---

## Faz 6 — Moderasyon ve Gizlilik Güvencesi

### Hedef
- Yanlış scope'ta bilgi sızmasını sıfıra indirmek.
- Günlük sistemini güvenli ve sürdürülebilir hale getirmek.

### Yapılacaklar
1. Event policy dosyası oluştur (`log-policy.ts`):
- Hangi event `general`
- Hangi event `personal`
- Hangi event `hidden/debug`
2. `game-logger.ts` içinde policy check uygula.
3. Test senaryosu yaz:
- Dedektif sonucu genel sekmede görünmüyor mu?
- Doktor koruma hedefi genel sekmede çıkmıyor mu?
- Vampir oy önizlemesi sadece vampirde mi?

### Entegrasyon Noktaları
- `apps/mobile/src/logging/game-logger.ts`
- `apps/mobile/src/logging/log-feed-store.ts`
- `apps/mobile/src/socket/runtime.ts`

### Çıktı
- Günlük sistemi bilgi güvenliği açısından denetlenebilir hale gelir.

---

## Faz 7 — UI/UX Son Rötuşlar

### Hedef
- Günlük ekranını hızlı okunur, mobilde akıcı ve görsel olarak tutarlı hale getirmek.

### Yapılacaklar
1. Kartları önem sırasına göre renklendir:
- Kritik (elme, oyun sonu)
- Bilgi (faz geçişi)
- Kişisel (özel aksiyon)
2. Zaman etiketi standardı (`HH:mm:ss`) ve olay ikonları ekle.
3. Uzun payload/JSON gösterimini tamamen kaldır (debug mode hariç).
4. Arama ve filtre ekle:
- Sadece Gece
- Sadece Oylama
- Sadece Kişisel

### Entegrasyon Noktaları
- `apps/mobile/src/screens/GameLogScreen.tsx`
- `apps/mobile/src/theme/*`

### Çıktı
- Günlük ekranı oyuncunun oyunu okumak için aktif kullandığı ana ekranlardan biri olur.

---

## Uygulama Sırası ve Bağımlılık

1. Faz 1
2. Faz 2
3. Faz 3
4. Faz 6
5. Faz 4
6. Faz 5
7. Faz 7

Not: Faz 6'yı erken almak kritik; aksi halde gizli bilgilerin yanlış scope'a düşme riski artar.

---

## Başarı Kriterleri

- Genel günlükte teknik event görünmeyecek.
- Kişisel günlükte role özel bilgi doğru scope ile görünecek.
- Oyun sırasında gizli bilgi yanlış oyuncuya sızmayacak.
- Oyun sonu analiz oyuncu tarafından anlaşılır olacak.
- Günlük ekranı test/debug ekranı değil, oyun deneyimi parçası olacak.
