# Vampir Köylü — Lobby Compact + RoleReveal V2 Fazlı Agent Promptu

Bu dosya yeni agent/Codex oturumuna doğrudan verilecek fazlı görev dokümanıdır.

Amaç:
- Lobby sticky onay/start alanını compact hale getirmek
- Lobby üst header alanının scroll ile birlikte hareket etmesini sağlamak
- RoleReveal ekranını referans görsele daha yakın premium gothic/codex reveal deneyimine taşımak

## Kullanım Talimatı

Agent bu dosyayı okuyunca **hemen tüm fazları uygulamayacak**.

Kullanıcı hangi fazı isterse sadece o faz uygulanacak.

Örnek kullanım:

```text
Faz 1'i yap
Faz 2'yi yap
Faz 3'ü yap
```

Kural:

```text
Kullanıcı “Faz 1’i yap” derse sadece Faz 1 uygulanır.
Kullanıcı “Faz 2’ye geç” derse sadece Faz 2 uygulanır.
Kullanıcı “hepsini yap” demedikçe bütün fazlar tek seferde uygulanmaz.
```

---

## Global Kurallar

Önce mevcut proje referansını oku:

```text
chatgecmisi/vampir_proje_structure_guncel_agent_referansi_v2_tam.md
cursor_premium_rol_a_l_deneyimi.md
```

Bu görevler yalnızca `apps/mobile` UI/UX düzeltmesidir.

## Değiştirilebilir Dosyalar

```text
apps/mobile/src/screens/LobbyScreen.tsx
apps/mobile/src/components/ScreenShell.tsx
apps/mobile/src/components/PrimaryButton.tsx
apps/mobile/src/components/RoleRevealCard.tsx
apps/mobile/src/screens/RoleRevealScreen.tsx
apps/mobile/src/ui/role-theme.ts
apps/mobile/src/ui/ui-standard.ts
apps/mobile/src/components/PhaseCountdown.tsx
apps/mobile/src/components/GameBackground.tsx
```

## Değiştirilmeyecek Alanlar

```text
apps/server/*
packages/shared/*
socket event payloadları
game-store rule logic
bot logic
room-manager
role assignment
game rules
```

## Ana Mimari Kural

```text
Backend server-authoritative kalır.
Mobile oyun kuralı hesaplamaz.
Mobile bot kararı üretmez.
Mobile bot hedefi/oyu/konuşması üretmez.
Bu görev sadece UI ve animasyon polish görevidir.
```

## Her Faz Sonrası Doğrulama

Her faz sonunda çalıştır:

```bash
npx tsc -p apps/mobile/tsconfig.json --noEmit
git diff --check
```

Server/shared dosyalarına dokunulduysa geri al.

---

# Faz 1 — Lobby Sticky CTA Compact Revizyon

## Hedef

Lobby alt sticky onay/start alanı şu an çok yüksek ve ekranın büyük kısmını kaplıyor.

Bu fazda yalnızca sticky bottom action bar compact hale getirilecek.

## Mevcut Sorun

Sticky alanda şu bloklar fazla büyük duruyor:

```text
Host Kontrolü
hazır/onay durumu
Oyunu Başlat butonu
açıklama / reason kutusu
```

Sonuç:
- Oyuncu listesi ve bot alanı boğuluyor
- Sticky alan içerikten fazla rol çalıyor
- Küçük iPhone ekranında ekranın altı gereksiz doluyor

## İstenen Tasarım

### Host için compact yapı

```text
[shield icon] Host Kontrolü                 [HOST]
3/4 hazır · 1 bekliyor

[Oyunu Başlat]
küçük disabled/status reason
```

### Non-host için compact yapı

```text
[check icon] Hazır Durumu
Onay bekleniyor / Hazırsın

[Onay Ver] / [Onayı Geri Al]
```

## Uygulama Kuralları

- Sticky container padding azalt
- Kart yüksekliğini belirgin düşür
- İç boşlukları ve gap değerlerini azalt
- Icon kutularını küçült
- Buton yüksekliği yaklaşık `48-54px` aralığında kalsın
- Touch target güvenli kalsın
- Disabled reason ayrı büyük panel değil, küçük tek satır info row olsun
- Yeşil/kırmızı durum kutuları çok yüksek olmasın
- Safe-area korunmalı
- ScrollView bottom padding sticky alanın yeni yüksekliğine göre güncellenmeli

## Yasaklar

```text
Sticky içinde 3 ayrı büyük kart kullanma.
Oyunu Başlat butonunu dev banner gibi yapma.
Ready status + reason + button + footer info hepsini ayrı büyük panel yapma.
Oyuncu listesinin üstüne kalın blok bindirme.
Host/non-host davranışını değiştirme.
```

## İncelenecek Dosyalar

```text
apps/mobile/src/screens/LobbyScreen.tsx
apps/mobile/src/components/PrimaryButton.tsx
apps/mobile/src/ui/ui-standard.ts
apps/mobile/src/components/ScreenShell.tsx
```

Gerekirse:

```text
apps/mobile/src/components/ReadyPanel.tsx
apps/mobile/src/components/HostStartPanel.tsx
```

## Kabul Kriterleri

- [ ] Sticky CTA alanı önceki halden belirgin şekilde daha kısa
- [ ] Küçük iPhone ekranında içerik alanını boğmuyor
- [ ] Host/non-host davranışı bozulmadı
- [ ] Disabled reason hâlâ görünüyor
- [ ] Safe-area korunuyor
- [ ] Sadece alt CTA sticky kalıyor
- [ ] TypeScript hatası yok

## Faz 1 Final Rapor Formatı

```text
Faz 1 tamamlandı.

Değişen dosyalar:
- ...

Lobby sticky compact değişiklikleri:
- ...

Kontrol:
- npx tsc -p apps/mobile/tsconfig.json --noEmit
- git diff --check
```

---

# Faz 2 — Lobby Header Sticky Davranışını Kaldır

## Hedef

Lobby ekranında üst header/content aşağı kaydırıldığında sabit kalmamalı.

Şu an `LOBİ` başlığı ve üst alan sticky/fixed gibi görünüyor. Bu istenmiyor.

Bu fazda yalnızca lobby üst header scroll davranışı düzeltilecek.

## İstenen Davranış

```text
Lobby aşağı kaydırıldığında üst başlık ve üst boşluk scroll ile birlikte yukarı gitmeli.
Sabit kalacak tek alan alt compact CTA olmalı.
Diğer ekranların header/bottom nav davranışı bozulmamalı.
```

## Kontrol Edilecekler

- `ScreenShell` header fixed/sticky mi?
- `LobbyScreen` kendi içinde header render ediyor mu?
- `ScrollView` top spacing / absolute header / stickyHeaderIndices kullanıyor mu?
- `ScreenShell` scene bazlı header davranışı destekliyor mu?
- Gerekirse sadece lobby için `hideHeader`, `headerMode="scroll"` veya benzeri düşük riskli prop eklenebilir

## Uygulama Kuralları

- En düşük riskli çözümü seç
- Diğer ekranların header davranışını bozma
- Sadece `LobbyScreen` etkilenmeli
- Safe-area başlangıç boşluğu mantıklı kalmalı
- Bottom nav etkilenmemeli

## Yasaklar

```text
ScreenShell global header davranışını tüm ekranlarda bozma.
Bottom nav'ı kaldırma.
Lobby content'i safe-area altına sokma.
Scroll başlangıcında header'ı tamamen kaybettirme.
```

## İncelenecek Dosyalar

```text
apps/mobile/src/screens/LobbyScreen.tsx
apps/mobile/src/components/ScreenShell.tsx
```

## Kabul Kriterleri

- [ ] Lobby aşağı kayınca üst başlık sabit kalmıyor
- [ ] Header/content scroll ile birlikte hareket ediyor
- [ ] Diğer ekranların header düzeni bozulmuyor
- [ ] Safe-area boşluğu mantıklı
- [ ] Bottom sticky CTA davranışı korunuyor
- [ ] TypeScript hatası yok

## Faz 2 Final Rapor Formatı

```text
Faz 2 tamamlandı.

Değişen dosyalar:
- ...

Header scroll düzeltmeleri:
- ...

Kontrol:
- npx tsc -p apps/mobile/tsconfig.json --noEmit
- git diff --check
```

---

# Faz 3 — RoleReveal V2 Hard Polish

## Hedef

RoleReveal ekranı hâlâ referans görsele yeterince yaklaşmadı.

Önceki Cursor çalışması `glowOuter`, flip, shimmer ve stagger eklemiş olabilir; fakat görsel sonuç hâlâ düz app card hissinde.

Bu fazda RoleReveal yeniden daha sert şekilde polish edilecek.

## Net Teşhis

Mevcut sonuç:
- büyük rounded rectangle
- basit gold border
- role image normal kart içine basılmış gibi
- glow düz dikdörtgen blok gibi
- üst crest/emblem yok
- kırık altın/stone frame dili yok
- referanstaki codex/artifact hissi yok

Referans hedef:
- premium gothic codex kart
- kart arkasında dramatik oval/radial altın ışık
- üst crest/emblem/plate
- ornamental çizgiler
- kırık altın / stone frame hissi
- kart çevresinde smoke/ember/shard
- kart açılışı sahnelenmiş reveal gibi

## Önemli Not

Önceki yapılanları körlemesine koruma.

Kötü görünen layer/stil varsa değiştir.  
Ama oyun state, socket, role data ve asset isimleri bozulmayacak.

## Hedef Görsel Katmanlar

RoleReveal kartı şu katmanlara yaklaşmalı:

```text
OuterSceneGlow
  - kart arkasında oval/radial gold glow illüzyonu
  - dikdörtgen blok gibi görünmemeli
  - merkezden yayılan sıcak ışık

SmokeAndShardLayer
  - 3-6 küçük floating shard/dust/ember
  - düşük opacity
  - performans dostu Animated loop

CodexFrame
  - dış stone/dark frame
  - çift gold border
  - corner ornament çizgileri
  - üstte küçük crest/emblem plate

RoleArtWindow
  - role image daha büyük ve sahneli
  - image üstünde subtle vignette
  - alt taraf role title için karartılmış gradient

RoleTitlePanel
  - role adı kart içinde büyük gold typographic odak
  - yanında küçük ornamental divider çizgileri
  - açıklama dark inset panel içinde

BottomSeal
  - küçük team/role icon seal
  - referanstaki alt badge hissine yakın
```

## RoleRevealScreen Layout Hedefi

- Ekran referanstaki gibi bütünleşik görünmeli
- Kart merkezde ana sahne objesi olmalı
- Header kartla ilişkili durmalı
- Kart ile timer arasında dengeli boşluk olmalı
- Toast varsa kart içine çakışmamalı
- Mevcut screenshot’taki geniş düz arka blok kaldırılmalı veya oval glow’a çevrilmeli

## Animasyon Hedefi

### Kapalı kart

```text
Gotik card back gibi görünmeli.
Ortada emblem/lock/codex mark olmalı.
Sıradan placeholder gibi durmamalı.
```

### Tap feedback

```text
Kart hafif scale down/up
Glow surge
Kısa shimmer hazırlığı
```

### Reveal

3D flip iyi görünüyorsa kullan.  
Eğer RN’de zayıf duruyorsa alternatif staged reveal kullan:

```text
card back opacity + scale + hafif rotateZ
front card scale/fade-in
center light burst
shimmer sweep
```

Önemli olan teknik flip değil, görsel reveal hissidir.

### Reveal sonrası

```text
role image önce
sonra title
sonra description
sonra bottom seal
hafif ambient glow devam
```

## Görsel Düzeltme Kuralları

- Glow rectangle gibi görünmeyecek
- Kart dış halo oval/radial hissi verecek
- Border tek çizgi değil, layered frame gibi olacak
- Role image üst kısmı fazla kesiliyorsa crop düzeltilecek
- Kart iç padding dengelenecek
- Kart daha artifact/codex gibi duracak
- Text panel modern app-card gibi durmayacak
- Role adı ve açıklama okunaklı kalacak

## Asset Opsiyonu

Eğer mevcut asset yoksa hard fail verme.

Şunları RN view/gradient ile simüle et:

```text
corner gold lines
tiny shard triangles/diamonds
crest plate
ornamental divider
smoke/dust dots
layered border
```

Asset slotu bırakılabilir ama app crash etmemeli.

Olası asset slotları:

```text
apps/mobile/src/assets/ui/frame_gold_panel.png
apps/mobile/src/assets/ui/ornament_divider_red_gold.png
apps/mobile/src/assets/ui/emblem_vampire_gold.png
apps/mobile/src/assets/ui/texture_dark_stone.png
```

## İncelenecek Dosyalar

```text
apps/mobile/src/screens/RoleRevealScreen.tsx
apps/mobile/src/components/RoleRevealCard.tsx
apps/mobile/src/ui/role-theme.ts
apps/mobile/src/ui/ui-standard.ts
apps/mobile/src/components/PhaseCountdown.tsx
apps/mobile/src/components/GameBackground.tsx
```

## Kabul Kriterleri

- [ ] RoleReveal önceki screenshot’taki rounded app-card gibi görünmüyor
- [ ] Kart referans görsele daha yakın codex/artifact hissi veriyor
- [ ] Kart arkasındaki ışık dikdörtgen değil, oval/radial halo gibi
- [ ] Üst crest/emblem/plate hissi var
- [ ] Corner/frame detayları var
- [ ] Reveal motion görsel olarak sahnelenmiş
- [ ] Sadece image swap hissi yok
- [ ] Timer/bottom nav bozulmadı
- [ ] Küçük ekranlarda kart taşmıyor
- [ ] TypeScript hatası yok

## Faz 3 Final Rapor Formatı

```text
Faz 3 tamamlandı.

Değişen dosyalar:
- ...

RoleReveal V2 düzeltmeleri:
- frame/codex yapısı
- glow düzeltmesi
- reveal motion
- küçük ekran önlemleri

Kontrol:
- npx tsc -p apps/mobile/tsconfig.json --noEmit
- git diff --check
```

---

# Faz 4 — Gerçek Cihaz QA ve Küçük Düzeltmeler

## Hedef

Faz 1-3 tamamlandıktan sonra gerçek cihaz davranışı kontrol edilecek.

Bu fazda yeni büyük tasarım yapılmayacak. Sadece QA sonrası küçük düzeltmeler yapılacak.

## Test Senaryoları

### Lobby

```text
1 insan + 3 bot
1 insan + 10 bot
host görünümü
non-host görünümü
küçük iPhone ekranı
safe-area alt boşluk
scroll sırasında sticky CTA overlap
keyboard açık/kapalı
```

### RoleReveal

```text
kapalı kart görünümü
tap feedback
reveal animasyonu
role image crop
timer overlap
toast overlap
bottom nav overlap
küçük ekran taşma
```

## Kabul Kriterleri

- [ ] Lobby sticky CTA içerik kapatmıyor
- [ ] Lobby header scroll davranışı doğru
- [ ] RoleReveal küçük ekranda taşmıyor
- [ ] RoleReveal reveal animasyonu takılmıyor
- [ ] Toast/kart/timer çakışmıyor
- [ ] TypeScript hatası yok

## Faz 4 Final Rapor Formatı

```text
Faz 4 tamamlandı.

QA edilen alanlar:
- ...

Küçük düzeltmeler:
- ...

Kontrol:
- npx tsc -p apps/mobile/tsconfig.json --noEmit
- git diff --check
```

---

# Genel Final Rapor Formatı

Kullanıcı tüm fazları bitirdikten sonra özet isterse şu formatı kullan:

```text
Tamamlanan fazlar:
- Faz 1: ...
- Faz 2: ...
- Faz 3: ...
- Faz 4: ...

Değişen dosyalar:
- ...

Kontrol:
- npx tsc -p apps/mobile/tsconfig.json --noEmit
- git diff --check

Kalan riskler:
- ...
```
