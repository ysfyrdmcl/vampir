# Vampir Köylü — Günlük Sistemi Geliştirme Raporu

Bu dosya, **Günlük** ekranının gerçek oyuncular için nasıl çalışması gerektiğini fazlara bölerek açıklar. Amaç debug log göstermek değil; oyuncuya oyun geçmişini, kendi özel bilgilerini ve stratejik notlarını temiz şekilde sunmaktır.

---

## 1. Mevcut Durum Problemi

Şu an Günlük ekranında görünen içerikler oyuncu için anlamlı değil:

```text
test.phase.set
test.night.resolve.done
test.night.resolve.kill
test.action.bot
```

Bunlar oyuncu günlüğü değil, **developer/debug loglarıdır**.

Doğru ayrım:

```text
Oyuncu Günlüğü ≠ Sistem Debug Logu
```

Production arayüzünde `test.*`, `debug.*`, teknik event isimleri veya backend event kodları görünmemeli.

---

## 2. Günlük Sisteminin Ana Amacı

Günlük ekranı şu 4 işi yapmalı:

```text
1. Oyuncuya oyunda ne olduğunu hatırlatmalı.
2. Gizli bilgileri yanlış kişilere sızdırmamalı.
3. Oyuncunun kendi stratejik notlarını tutmasına izin vermeli.
4. Oyun sonu analizini daha tatmin edici hale getirmeli.
```

Uygulama burada oyuncunun yerine karar vermemeli. Sadece doğru bilgiyi, doğru oyuncuya, doğru zamanda göstermeli.

---

## 3. Günlük Ana Yapısı

Mevcut ekrandaki **Genel / Kişisel** ayrımı doğru. Bunu koru.

Önerilen yapı:

```text
Günlük
├── Genel
│   ├── Faz geçişleri
│   ├── Gece sonuçları
│   ├── Oylama sonuçları
│   ├── Beraberlikler
│   └── Oyun sonu
│
└── Kişisel
    ├── Rol aksiyonlarım
    ├── Bana özel bilgiler
    ├── Oyuncu etiketlerim
    └── Manuel notlarım
```

---

# 4. Fazlara Göre Geliştirme Planı

---

## Faz 1 — Debug Logları Temizle ve Public Günlüğü Oluştur

### Amaç

Oyuncuya teknik event isimleri göstermek yerine anlamlı oyun olayları göstermek.

### Yapılacaklar

- `test.phase.set` gibi teknik kayıtları UI’dan kaldır.
- Genel günlükte sadece herkesin bildiği public olayları göster.
- Event kodlarını kullanıcı dostu Türkçe metne çevir.
- Debug log gerekiyorsa sadece test/developer modda göster.

### Genel Günlükte Gösterilecek Bilgiler

| Olay | Genel Günlükte Gösterilsin mi? |
|---|---|
| Gece başladı | Evet |
| Gündüz başladı | Evet |
| Kim öldü | Evet |
| Ölen kişinin rolü | Ayara bağlı |
| Oylama başladı | Evet |
| Oylama sonucu | Evet |
| Beraberlik oldu | Evet |
| Kim korundu | Hayır |
| Dedektif kimi sorguladı | Hayır |
| Vampirler kimi hedefledi | Hayır |
| Doktor saldırıyı engelledi mi | Dolaylı |
| Oyuncuların kişisel notları | Hayır |

### Teknik Event → UI Metni Mapping

| Teknik Event | Kullanıcıya Gösterilecek Metin |
|---|---|
| `test.phase.set` | Production’da gösterme |
| `test.action.bot` | Production’da gösterme |
| `night.started` | Gece başladı. Köy karanlığa gömüldü. |
| `day.started` | Gündüz başladı. Köy konuşabilir. |
| `night.resolve.kill` | `{playerName}` gece elendi. |
| `night.resolve.blocked` | Bu gece kimse ölmedi. |
| `vote.started` | Oylama başladı. |
| `vote.tie` | Oylama berabere bitti. |
| `vote.execution` | `{playerName}` köyden gönderildi. |
| `game.finished` | Oyun bitti. |

### Genel Günlük Kart Örnekleri

#### Gece Başladı

```text
1. Gece
Köy karanlığa gömüldü.
```

#### Gündüz Başladı

```text
1. Gündüz
Köy uyandı. Tartışma başladı.
```

#### Gece Ölümü

```text
1. Gece Sonucu
Leydi Ezmarelda gece elendi.
```

#### Gece Kimse Ölmedi

```text
1. Gece Sonucu
Bu gece kimse ölmedi.
```

Bu metinde “doktor korudu” denmemeli. Çünkü doktoru ele verebilir.

#### Oylama Sonucu

```text
1. Gündüz Oylaması
Kont Dracula köyden gönderildi.
```

#### Beraberlik

```text
Oylama Berabere Bitti
En çok oy alanlar: Yusuf, GölgeAvcı.
İkinci oylama başladı.
```

#### Beraberlik Bozulmadı

```text
Köy Karar Veremedi
Beraberlik bozulmadı. Kimse gönderilmedi.
```

### Faz 1 Sonunda Beklenen Sonuç

Günlük artık debug ekranı gibi değil, oyun geçmişi gibi görünür.

---

## Faz 2 — Kişisel Günlüğü Role Göre Anlamlı Hale Getir

### Amaç

Her oyuncuya sadece kendi bilmesi gereken özel bilgileri göstermek.

### Kişisel Günlükte Gösterilecek Bilgiler

| Bilgi | Kim Görür? |
|---|---|
| Dedektif sorgu sonuçları | Sadece Dedektif |
| Doktor koruma geçmişi | Sadece Doktor |
| Vampir hedef geçmişi | Sadece Vampirler |
| Aşık bağı | Sadece ilgili Aşıklar |
| Avcı özel bilgisi | Sadece Avcı |
| Oyuncunun manuel notları | Sadece kendisi |
| Oyuncu etiketleri | Sadece kendisi |

---

## Role Göre Kişisel Günlük İçeriği

### Dedektif

Dedektifin kişisel günlüğünde sorguladığı oyuncular ve sonuçları görünmeli.

```text
1. Gece — Sorgu
Kont Dracula sorgulandı.
Sonuç: Vampir.
```

```text
2. Gece — Sorgu
GölgeAvcı sorgulandı.
Sonuç: Masum.
```

Ek uyarı:

```text
Bu bilgi sadece sende. Açıklamak veya saklamak senin kararın.
```

---

### Doktor

Doktorun kişisel günlüğünde kimi koruduğu görünmeli.

```text
1. Gece — Koruma
Yusuf korundu.
```

Eğer koruma saldırıyı engellediyse sadece doktora:

```text
1. Gece — Koruma
Yusuf korundu.
Bir saldırı engellendi.
```

Genel günlüğe ise sadece şu yazılmalı:

```text
Bu gece kimse ölmedi.
```

---

### Vampir

Vampirlerin kişisel günlüğünde gece hedefleri ve sonuçları görünmeli.

```text
1. Gece — Hedef
Vampirler Leydi Ezmarelda’yı hedef aldı.
Sonuç: Hedef elendi.
```

Saldırı başarısız olursa:

```text
1. Gece — Hedef
Vampirler Yusuf’u hedef aldı.
Sonuç: Saldırı başarısız oldu.
```

---

### Avcı

Avcı için rol etkisi günlüğe açıklayıcı şekilde eklenebilir.

```text
Rol Etkisi
Gündüz elenirsen son nefesinde bir oyuncuyu hedef alabilirsin.
```

Avcı elendiğinde:

```text
Son Nefes
GölgeAvcı hedef alındı.
```

---

### Gardiyan

Gardiyan kişisel günlüğünde koruma kullanımını görmeli.

```text
Gündüz Koruması
Yusuf bugün koruma altına alındı.
```

Eğer Gardiyan tek kullanımlıysa:

```text
Bu gücü artık tekrar kullanamazsın.
```

Genel günlüğe açık koruma gerekiyorsa:

```text
Yusuf bugün koruma altında. Bu oylamada hedef alınamaz.
```

---

### Aşık

Aşıklar kişisel günlüğünde bağlı olduğu kişiyi görmeli.

```text
Gizli Bağ
Leydi Ezmarelda ile bağlısın.
Biriniz ölürse diğeriniz de ölür.
```

Biri ölürse:

```text
Aşk Bağı Koptu
Yusuf elendi. Aşk bağı yüzünden Leydi Ezmarelda da oyundan çıktı.
```

Bu genel günlükte de gösterilebilir. Ancak aşk bağının varlığı oyun başında diğer oyunculara gösterilmemeli.

---

### Köylü

Köylünün özel rol aksiyonu yoksa kişisel günlük boş kalmamalı.

Önerilen boş durum:

```text
Henüz kişisel kaydın yok.
Tartışmalarda şüphelendiğin kişileri buraya not alabilirsin.
```

---

## Faz 2 Sonunda Beklenen Sonuç

Oyuncu kendi rolüne ait kritik bilgileri kaybetmez. Dedektif sonuçları, doktor korumaları, vampir hedefleri ve özel bağlar doğru kişiye görünür.

---

## Faz 3 — Manuel Not Sistemi Ekle

### Amaç

Oyuncuların kendi özel stratejik notlarını tutabilmesi.

Sosyal çıkarım oyunlarında oyuncular şunları takip etmek ister:

```text
- Kim ne iddia etti?
- Kim kime oy verdi?
- Kim sessiz kaldı?
- Kim dedektif olduğunu söyledi?
- Kim çelişti?
- Kim fazla savunmaya geçti?
```

Bu yüzden manuel not sistemi faydalı olur.

---

## Manuel Not Olmalı mı?

```text
Evet.
```

Ama sadece **kişisel** olmalı.

Oyuncunun yazdığı not:

```text
- Diğer oyunculara görünmemeli.
- Genel günlüğe düşmemeli.
- Oyun sonucunu etkilememeli.
- Sunucu tarafından oyun kuralı olarak yorumlanmamalı.
```

---

## Manuel Not Nerede Olmalı?

**Kişisel** tab içinde yer almalı.

Önerilen yapı:

```text
Kişisel
├── Rol Günlüğü
├── Oyuncu Etiketlerim
└── Benim Notlarım
```

---

## Not Ekleme UI

### Buton

Sağ altta küçük floating buton:

```text
+ Not
```

veya üst bölümde küçük buton:

```text
Not Ekle
```

Büyük kırmızı ana buton yapma. Not yazmak ana oyun aksiyonu değil, yardımcı aksiyondur.

---

## Not Yazma Ekranı

Bottom sheet olarak açılmalı:

```text
Kişisel Not

Bu not sadece sana görünür.

[Not alanı]
Örn: Kont Dracula çok hızlı Leydi’ye oy verdi.

Kaydet
Vazgeç
```

---

## Not Uzunluğu

Önerilen limit:

```text
Maksimum 250 karakter
```

Sebep: Fiziksel oyunda uzun yazı yazmak tempoyu öldürür.

---

## Manuel Not Kartı Tasarımı

```text
06:12
Kişisel Not
“Kont Dracula sürekli Yusuf’u savunuyor. İkisi birlikte olabilir.”
```

### Stil

```text
- Koyu siyah / bordo kart
- İnce altın border
- Sol üstte küçük kalem ikonu
- Saat bilgisi küçük ve altın renkli
- Not metni krem rengi
```

---

## Hızlı Not Etiketleri

Serbest yazıya ek olarak hızlı etiketler daha kullanışlı olur.

Oyuncu kartına basınca:

```text
Şüpheli
Masum gibi
Çok sessiz
Rol iddia etti
Beni suçladı
Korunmalı
```

Bu etiketler sadece not sahibine görünmeli.

---

## Faz 3 Sonunda Beklenen Sonuç

Oyuncu sosyal çıkarım yaparken uygulamayı gerçek bir kişisel defter gibi kullanabilir.

---

## Faz 4 — Oyuncu Bazlı Not ve Etiket Sistemi

### Amaç

Notları sadece kronolojik liste olarak değil, oyuncu bazlı takip edilebilir hale getirmek.

Bu sistem özellikle 6+ oyunculu oyunlarda çok işe yarar.

---

## Oyuncu Profil Modalı

Her oyuncu kartına tıklandığında küçük bir modal açılabilir:

```text
Kont Dracula

Şüphe Seviyesi:
Masum gibi / Kararsız / Şüpheli / Çok Şüpheli

Notlarım:
- 1. gündüz Leydi’ye oy verdi.
- Dedektif iddiasına karşı çıktı.
```

---

## Oyuncu Etiketleri

Önerilen etiketler:

```text
Masum gibi
Kararsız
Şüpheli
Çok şüpheli
Rol iddia etti
Sessiz kaldı
Beni suçladı
Korunmalı
```

---

## Günlükte Oyuncu Etiketleri Bölümü

Kişisel tabda:

```text
Oyuncu Etiketlerim

Kont Dracula — Şüpheli
GölgeAvcı — Masum gibi
Leydi Ezmarelda — Kararsız
```

---

## Etiketlerin Gizliliği

Oyuncu etiketleri:

```text
- Sadece etiketi veren oyuncuya görünmeli.
- Oyun sonunda bile diğer oyunculara açılmamalı.
- Genel günlükte görünmemeli.
```

---

## Faz 4 Sonunda Beklenen Sonuç

Oyuncular her kişiyi ayrı ayrı takip edebilir. Günlük sadece olay listesi değil, strateji aracı olur.

---

## Faz 5 — Ölüm Sonrası Günlük Davranışı

### Temel Karar

Oyuncu öldüğünde kendi notları diğer oyunculara açılmamalı.

Net karar:

```text
Ölen kişinin manuel notları görünmemeli.
```

---

## Neden Açılmamalı?

Dedektif öldüyse notlarında şu olabilir:

```text
Kont Dracula = Vampir
Leydi = Masum
```

Bu notlar ölümde açılırsa dedektifin bilgisi herkese otomatik açıklanmış olur. Sosyal oyun bozulur.

Sıradan oyuncu da notuna şunu yazmış olabilir:

```text
Bence Yusuf dedektif.
```

Bu bilginin ölümde açılması oyuna dış müdahale gibi olur.

---

## Ölünce Kim Ne Görür?

| İçerik | Öldükten Sonra Kim Görür? |
|---|---|
| Kendi manuel notları | Sadece kendisi |
| Kendi rol aksiyon geçmişi | Sadece kendisi |
| Genel günlük | Herkes |
| Tüm gizli bilgiler | Sadece oyun sonunda, resmi çözümlemede |
| Diğer oyuncuların manuel notları | Kimse |

---

## Ölü Oyuncu Not Yazabilir mi?

Öneri:

```text
Evet, yazabilir.
```

Ama bu notlar sadece kendisine görünmeli ve oyuna etki etmemeli.

Ölü oyuncu ekran mesajı:

```text
Elendin.
Artık konuşamaz ve oy veremezsin.
Kendi notlarını tutmaya devam edebilirsin.
```

Bu izleyici deneyimini güçlendirir.

---

## Faz 5 Sonunda Beklenen Sonuç

Ölü oyuncular oyunu izlemeye devam eder ama canlı oyunculara gizli bilgi sızdırmaz.

---

## Faz 6 — Oyun Sonu Günlüğü ve Çözümleme

### Amaç

Oyun bittiğinde tüm oyuncuların “ne olmuştu?” sorusuna tatmin edici cevap vermek.

Oyun sırasında gizli kalan bilgiler, oyun bittikten sonra resmi çözümleme olarak açılabilir.

---

## Oyun Sonunda Açılabilecek Bilgiler

```text
- Tüm roller
- Vampirlerin gece hedefleri
- Doktor korumaları
- Dedektif sorguları
- Gardiyan korumaları
- Avcı hedefi
- Aşık bağları
- Tüm oylama sonuçları
- Kazanan takım
```

---

## Oyun Sonunda Açılmaması Gereken Bilgiler

```text
- Oyuncuların manuel kişisel notları
- Oyuncu etiketleri
- Kişisel yorumlar
```

Manuel notlar resmi oyun kaydı değildir. Oyuncunun özel düşüncesidir.

---

## Oyun Sonu Günlüğü Örneği

```text
Oyun Sonu Çözümleme

Roller:
Yusuf — Dedektif
Kont Dracula — Vampir
Leydi Ezmarelda — Köylü
GölgeAvcı — Doktor

1. Gece:
Vampirler Leydi Ezmarelda’yı hedef aldı.
Doktor Yusuf’u korudu.
Dedektif Kont Dracula’yı sorguladı.
Sonuç: Kont Dracula Vampir.

1. Gündüz:
Kont Dracula köyden gönderildi.

Kazanan:
Köy Takımı
```

---

## Faz 6 Sonunda Beklenen Sonuç

Oyun bittiğinde oyuncular sonucu sadece görmez, oyunun nasıl oraya geldiğini de anlar. Bu tekrar oynama isteğini artırır.

---

# 5. Günlük Kartlarının Görsel Tasarımı

Şu an kartlar çok düz ve tekrar ediyor. Event türüne göre ikon/renk ayrımı yap.

| Event Türü | Renk | İkon |
|---|---|---|
| Gece | Bordo/Kırmızı | Ay |
| Gündüz | Altın | Güneş |
| Oylama | Krem/Altın | Terazi / el |
| Ölüm | Kırmızı | X / mezar |
| Koruma | Yeşil/Altın | Kalkan |
| Sorgu | Mor | Büyüteç |
| Kişisel not | Krem | Kalem |
| Oyun sonu | Altın/Kırmızı | Taç / bayrak |

---

## Genel Günlük Kart Tasarımı

```text
[İkon] 1. Gece Sonucu
06:06
Leydi Ezmarelda gece elendi.
```

### Stil

```text
- Koyu kart
- İnce bordo/altın border
- Event başlığı krem/beyaz
- Saat altın
- Açıklama sade Türkçe
```

---

## Kişisel Günlük Kart Tasarımı

```text
[Mor büyüteç] 1. Gece — Sorgu
Kont Dracula sorgulandı.
Sonuç: Vampir.
```

### Stil

```text
- Role özel renk vurgusu
- Bilgi kartı hissi
- Genel günlükten görsel olarak ayrışmalı
```

---

## Manuel Not Kart Tasarımı

```text
[Kalem] Kişisel Not
06:12
Kont Dracula sürekli Yusuf’u savunuyor.
```

### Stil

```text
- Daha küçük ve defter hissi veren kart
- Koyu bordo/siyah
- İnce altın çizgi
- Çok yüksek kontrast
```

---

# 6. Günlük Gizlilik Kuralları

## Genel Günlükte Yasak Bilgiler

```text
- Dedektif kimi sorguladı
- Doktor kimi korudu
- Vampirlerin ilk hedefi kimdi
- Aşıkların bağı kimle
- Oyuncuların manuel notları
- Oyuncu etiketleri
- Gizli rol aksiyonlarının ham sonucu
```

---

## Kişisel Günlükte Serbest Bilgiler

```text
- Kendi sorguların
- Kendi korumaların
- Kendi vampir hedeflerin
- Kendi aşk bağın
- Kendi manuel notların
- Kendi oyuncu etiketlerin
```

---

## Oyun Sonunda Açılabilecek Bilgiler

```text
- Tüm roller
- Tüm resmi aksiyonlar
- Tüm oylama geçmişi
- Kazanan takım
```

Ama manuel notlar ve kişisel etiketler açılmamalı.

---

# 7. Üretilecek Günlük Event Modeli

Önerilen genel yapı:

```ts
type JournalEntry = {
  id: string;
  roomId: string;
  round: number;
  phase: "night" | "day" | "vote" | "system" | "end";
  visibility: "public" | "private";
  playerId?: string;
  type:
    | "phase_started"
    | "night_result"
    | "vote_started"
    | "vote_tie"
    | "vote_execution"
    | "role_action"
    | "manual_note"
    | "player_tag"
    | "game_finished";
  title: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
```

---

## Public Entry Örneği

```json
{
  "visibility": "public",
  "round": 1,
  "phase": "night",
  "type": "night_result",
  "title": "1. Gece Sonucu",
  "message": "Leydi Ezmarelda gece elendi."
}
```

---

## Private Entry Örneği

```json
{
  "visibility": "private",
  "playerId": "p1",
  "round": 1,
  "phase": "night",
  "type": "role_action",
  "title": "1. Gece — Sorgu",
  "message": "Kont Dracula sorgulandı. Sonuç: Vampir."
}
```

---

## Manual Note Örneği

```json
{
  "visibility": "private",
  "playerId": "p1",
  "round": 1,
  "phase": "day",
  "type": "manual_note",
  "title": "Kişisel Not",
  "message": "Kont Dracula sürekli Yusuf’u savunuyor."
}
```

---

# 8. Günlük İçin UI Metinleri

## Boş Genel Günlük

```text
Henüz genel kayıt yok.
Oyun başladığında önemli olaylar burada görünecek.
```

## Boş Kişisel Günlük

```text
Henüz kişisel kaydın yok.
Rol aksiyonların ve kişisel notların burada görünecek.
```

## Manuel Not Bilgilendirme

```text
Bu not sadece sana görünür.
Diğer oyuncular notlarını göremez.
```

## Ölü Oyuncu Bilgilendirme

```text
Elendin.
Artık konuşamaz ve oy veremezsin.
Kendi notlarını tutmaya devam edebilirsin.
```

## Oyun Sonu Bilgilendirme

```text
Oyun bitti.
Artık tüm resmi aksiyonları çözümleme ekranında görebilirsin.
```

---

# 9. Önceliklendirilmiş Yapılacaklar

## 1. Öncelik — Zorunlu

```text
- test.* eventlerini production Günlük ekranından kaldır.
- Genel / Kişisel ayrımını veri seviyesinde uygula.
- Genel günlükte public olayları Türkçe göster.
- Gizli rol bilgilerini genel günlüğe yazma.
```

## 2. Öncelik — Stratejik Değer

```text
- Dedektif, Doktor, Vampir için kişisel rol günlüğü ekle.
- Manuel not ekleme özelliği ekle.
- Notların sadece not sahibine görünmesini sağla.
```

## 3. Öncelik — Oyun Kalitesi

```text
- Oyuncu bazlı etiket sistemi ekle.
- Oyuncu profil modalına kişisel not alanı ekle.
- Event türlerine göre ikon ve renk ayrımı yap.
```

## 4. Öncelik — Oyun Sonu

```text
- Oyun sonu çözümleme günlüğü ekle.
- Tüm resmi rol aksiyonlarını oyun sonunda aç.
- Manuel notları oyun sonunda bile gizli tut.
```

---

# 10. Net Kararlar

## Manuel not olsun mu?

```text
Evet.
```

Ama sadece kişisel olmalı.

---

## Ölen kişinin notları görünmeli mi?

```text
Hayır.
```

Sadece kendisi görmeli. Oyun sonunda bile diğer oyunculara açılmamalı.

---

## Dedektif sonuçları ölümde açılmalı mı?

```text
Hayır.
```

Sadece oyun sonunda resmi çözümleme ekranında açılabilir.

---

## Genel günlükte ne olmalı?

```text
Herkesin bildiği public olaylar.
```

---

## Kişisel günlükte ne olmalı?

```text
Rol bilgileri + kişisel notlar + oyuncu etiketleri.
```

---

# 11. Final Hedef

Günlük ekranının nihai amacı:

```text
Uygulama sadece sonucu göstermesin;
oyuncunun sosyal çıkarım yapmasına yardımcı olsun.
```

Şu anki debug benzeri yapı oyuncu için değer üretmez. Doğru tasarlanmış günlük ise oyunun stratejik derinliğini artırır.

En iyi final yapı:

```text
Günlük
├── Genel
│   ├── Herkesin bildiği olaylar
│   ├── Gece/gündüz sonuçları
│   ├── Oylama sonuçları
│   └── Oyun bitişi
│
└── Kişisel
    ├── Rol aksiyonlarım
    ├── Bana özel bilgiler
    ├── Oyuncu etiketlerim
    └── Manuel notlarım
```

Bu yapıyla Günlük ekranı debug ekranı olmaktan çıkar, gerçek oyuncular için stratejik oyun aracı haline gelir.
