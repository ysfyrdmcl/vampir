# Vampir Köylü — Yeni Rol Geliştirmeleri Raporu

Bu raporun odağı simülasyon botları değil, gerçek insanların aynı ortamda oynayacağı mobil moderatörlü **Vampir Köylü** oyunudur.

---

## 1. Ana karar: özel rolleri hemen açmalı mısın?

Kısa cevap: **Hayır, hepsini başlangıçta açma.**

Özel roller oyunu eğlenceli yapar ama erken eklersen 3 sorun çıkar:

```text
1. Yeni oyuncular rolü anlamaz.
2. Mobil akış karmaşıklaşır.
3. Oyun sosyal çıkarımdan kural ezberine kayar.
```

Klasik Mafia/Werewolf yapısında oyun zaten “bilgili azınlık kötü takım” ve “bilgisiz çoğunluk köylü takım” üzerine kurulur. Gece özel aksiyonlar, gündüz tartışma ve oylama döngüsüyle ilerler. Özel roller bu yapıyı güçlendirmek için eklenir, ana oyunun yerine geçmemelidir.

### Doğru strateji

Rolleri **paket paket** aç:

```text
Başlangıç Paketi:
- Köylü
- Vampir
- Dedektif
- Doktor

Orta Seviye Paket:
- Avcı
- Belediye Başkanı
- Gardiyan

Kaos / Parti Paketi:
- Aşıklar
- Susturucu
- Lanetli Köylü
- Deli / Soytarı
```

---

## 2. Rol ekleme prensibi

Her yeni rol şu 5 soruya net cevap vermeli:

| Soru | Neden önemli? |
|---|---|
| Bu rol hangi takımda? | Kazanma koşulu için |
| Ne zaman aksiyon alır? | Gece/gündüz akışı için |
| Aksiyonu gizli mi açık mı? | Sosyal manipülasyon için |
| Ölünce etkisi var mı? | Oyun sonu/infaz akışı için |
| Küçük oyuncu sayısında oyunu bozar mı? | Denge için |

Her rol için merkezi bir tanım formatı oluştur:

```ts
type RoleDefinition = {
  id: string;
  name: string;
  team: "village" | "vampire" | "neutral";
  minPlayers: number;
  phase: "night" | "day" | "passive" | "onDeath";
  isBeginnerFriendly: boolean;
  description: string;
  rules: string[];
};
```

Bu sadece teknik model değil; UI’daki rol kartları da buradan beslenmeli.

---

## 3. Rol 1 — Avcı

### Nedir?

Avcı köy tarafında güçlü bir roldür.

```text
Avcı ölürse, son nefesinde bir oyuncuyu yanında götürür.
```

### Takım

```text
Köy Takımı
```

### Oyuna etkisi

Avcı oyunda şu gerilimi yaratır:

```text
“Bu kişiyi asarsak ya Avcı çıkarsa?”
“Vampirler Avcıyı gece öldürürse kimi vuracak?”
“Avcı rolünü blöf olarak kullanabilir miyim?”
```

Bu rol sosyal baskıyı artırır. Oyuncular birini linç etmeden önce iki kere düşünür.

### Ne zaman çalışır?

#### Seçenek A — Her ölümde tetiklenir

```text
Avcı gece ölse de gündüz asılsa da birini vurur.
```

Daha güçlü ve kaotik.

#### Seçenek B — Sadece gündüz infazında tetiklenir

```text
Avcı sadece köy tarafından asılırsa birini yanında götürür.
```

Daha kontrollü.

### Önerilen kural

Başlangıçta:

```text
Avcı her ölümde tetiklenmesin.
Sadece gündüz infazında tetiklensin.
```

Çünkü gece öldürülen Avcıya ekstra aksiyon verirsen vampir takımını fazla cezalandırabilirsin.

### Kaç kişide açılmalı?

| Oyuncu | Öneri |
|---:|---|
| 4–5 | Açma |
| 6 | Opsiyonel ama riskli |
| 7–8 | Açılabilir |
| 9+ | Rahat açılır |

### Neden 4–5 kişide açılmamalı?

4 kişide Avcı ölünce birini daha öldürürse oyun anında kırılır.

Örnek:

```text
4 oyuncu:
1 Vampir
1 Avcı
2 Köylü
```

Gündüz Avcı yanlışlıkla asılır, bir köylüyü vurursa vampir direkt kazanabilir. Ya da vampiri vurursa oyun anında biter. Fazla keskin.

### Sistem kararı nasıl olmalı?

Avcı elendiğinde oyun hemen bitiş kontrolü yapmadan önce:

```text
Avcı Son Nefes
Bir oyuncu seç.
```

Sonra seçilen oyuncu elenir. Ardından bitiş kontrolü yapılır.

### UI akışı

```text
1. Oylama sonucu: Avcı elendi.
2. Avcıya özel ekran açılır.
3. Avcı hedef seçer.
4. Sistem sonucu açıklar.
5. Oyun bitiş kontrolü yapılır.
```

### Rol kartı metni

```text
AVCI

Köy takımındasın.

Gündüz köy tarafından elenirsen son nefesinde bir oyuncuyu yanında götürürsün.

Dikkatli ol: Yanlış kişiyi seçersen köye zarar verebilirsin.
```

### Oyun içi kısa açıklama

```text
Avcı son nefesinde birini hedef alacak.
```

---

## 4. Rol 2 — Belediye Başkanı

### Nedir?

Belediye Başkanı, gündüz oylamasında ekstra politik güç sahibi roldür. Bazı Mafia/Werewolf varyantlarında vote count değiştiren roller bulunur; örneğin bir oyuncunun oyu 2 sayılabilir veya oylama sonucunu etkileyebilir.

### Takım

```text
Köy Takımı
```

Ama burada iki farklı tasarım var.

### Tasarım A — Gizli Belediye Başkanı

Rol dağıtımında bir kişiye verilir:

```text
Bu oyuncunun oyu gizlice 2 sayılır.
```

#### Artısı

- Basit.
- Mobil sistem kolay uygular.
- Oyuncu rolünü açıklayıp açıklamamayı seçebilir.

#### Eksisi

- Oyuncular sonuçta “neden bu kişi elendi?” diye şaşırabilir.
- Oylama güvenini bozabilir.

### Tasarım B — Seçilmiş Belediye Başkanı

Köy gündüz bir oyuncuyu başkan seçer:

```text
Başkanın oyu 2 sayılır.
Başkan ölürse yetki düşer veya yeni başkan seçilir.
```

#### Artısı

- Sosyal oyun çok güçlenir.
- “Kime güveniyoruz?” tartışması doğar.
- Rol değil, oyun içi makam olur.

#### Eksisi

- Ek faz gerekir.
- Süre uzar.

### Önerilen tasarım

Başlangıçta **rol olarak değil, oyun modu/kurum olarak ekle**:

```text
Belediye Başkanı = seçilebilir makam
```

Yani rol kartı yerine “Köy Başkanı Seçimi” mekanizması daha iyi.

### Ne zaman aktif olsun?

| Oyuncu | Öneri |
|---:|---|
| 4–6 | Açma |
| 7–8 | Opsiyonel |
| 9+ | Açılabilir |
| 12+ | Tavsiye edilir |

### Oyuna etkisi

Başkan şu sosyal davranışları üretir:

```text
- Güven oylaması
- Vampirin başkan olmaya çalışması
- Dedektifin başkanı yönlendirmesi
- Başkanın açık hedef göstermesi
```

### Sistem kuralı

Varsayılan öneri:

```text
Başkanın oyu 2 sayılır.
Başkan ölürse ertesi gündüz yeni başkan seçilir.
Başkan kendine oy verebilir.
Başkan vampir de olabilir.
```

Başkanın vampir olabilmesi önemli. Yoksa sistem rol doğrulaması yapmış olur.

### UI akışı

İlk gündüzden önce veya ilk gündüz başında:

```text
Köy Başkanı Seçimi
Güvendiğiniz bir oyuncuyu başkan seçin.
```

Seçilen kişi için:

```text
Yusuf köy başkanı seçildi.
Başkanın oyu artık 2 sayılacak.
```

### Rol/kural kartı metni

```text
BELEDİYE BAŞKANI

Bu bir rol değil, köyün seçtiği makamdır.

Başkanın gündüz oyu 2 sayılır.
Başkan vampir de olabilir, köylü de olabilir.
Başkana güvenmek tamamen oyuncuların kararıdır.
```

---

## 5. Rol 3 — Gardiyan

### Nedir?

Gardiyan köy tarafında koruma/engelleme rolüdür. Doktora benzer ama aynı olmamalı.

Senin oyunun için Gardiyanı şöyle tasarlamak mantıklı:

```text
Gardiyan gündüz bir oyuncuyu oylamadan koruyabilir.
```

Yani Doktor gece öldürmeye karşı korur; Gardiyan gündüz linçe karşı korur.

### Takım

```text
Köy Takımı
```

### Oyuna etkisi

Gardiyan şu gerilimi yaratır:

```text
“Bugün bu kişiyi asamayız.”
“Gardiyan kimi korudu?”
“Gardiyan vampiri mi korudu?”
“Gardiyan son anda oyunu çevirdi.”
```

Bu rol, özellikle dedektifin kendini açıkladığı oyunlarda güçlüdür. Dedektif “Ben dedektifim” dediğinde Gardiyan onu gündüz infazdan koruyabilir.

### Kural önerisi

```text
Gardiyan oyun boyunca 1 kez bir oyuncuyu gündüz oylamasından korur.
Korunan oyuncu o gün aday olamaz veya elenemez.
Gardiyan kendini koruyamaz.
```

### Alternatif

Daha basit versiyon:

```text
Gardiyan gece bir kişiyi hapse alır.
Hapse alınan kişi ne ölür ne aksiyon yapar.
```

Ama bu Doktor + Roleblocker karışımı olur. Yeni oyuncular için karmaşık.

### Önerilen tasarım

Başlangıç için:

```text
Gardiyan = gündüz kalkanı
```

Daha temiz ve Doktordan ayrışıyor.

### Kaç kişide açılmalı?

| Oyuncu | Öneri |
|---:|---|
| 4–6 | Açma |
| 7 | Riskli |
| 8–10 | Açılabilir |
| 11+ | İyi çalışır |

### Neden küçük oyunda açılmamalı?

Az oyuncuda bir kişiyi gündüz infazdan korumak oyunu çok fazla uzatabilir veya vampiri aşırı zorlayabilir.

### UI akışı

Gündüz tartışma başlamadan önce Gardiyan hayattaysa:

```text
Gardiyan Kararı
Bugün kimi koruyacaksın?
```

Seçim sonrası köye:

```text
Bugün Yusuf koruma altında.
Yusuf bu oylamada hedef alınamaz.
```

Bu açık olmalı. Çünkü gündüz oylamada oyuncuların neden birini seçemediğini bilmesi gerekir.

### Rol kartı metni

```text
GARDİYAN

Köy takımındasın.

Oyun boyunca bir kez, gündüz bir oyuncuyu köy oylamasından koruyabilirsin.

Korunan oyuncu o gün elenemez.
Yanlış kişiyi korursan vampirlere avantaj sağlayabilirsin.
```

---

## 6. Rol 4 — Aşıklar

### Nedir?

Aşıklar iki oyuncuyu birbirine bağlayan özel mekaniktir. Bazı Werewolf varyantlarında Cupid/Aşıklar gibi roller oyuncular arasında bağ kurar; biri ölürse diğeri de ölür ve bazı varyantlarda farklı takımlardaki aşıkların özel kazanma koşulu olabilir.

### Bu rol mü, mekanik mi?

Aslında iki parçalıdır:

```text
Cupid / Çöpçatan = Bağ kuran rol
Aşıklar = Bağlanan iki oyuncu
```

Senin oyunda başlangıç için Cupid eklemek yerine sistem otomatik iki aşık seçebilir.

### Takım

Aşıkların takımı normalde değişmez:

```text
Vampirse vampir takımında
Köylüyse köy takımında
```

Ama özel modda:

```text
Eğer bir vampir ve bir köylü aşık olursa, birlikte ayrı kazanabilirler.
```

Bu çok kaotik ama çok eğlenceli.

### Basit kural

```text
İki oyuncu aşık olur.
Biri ölürse diğeri de kalp kırıklığından ölür.
```

### Gelişmiş kural

```text
Aşıklar farklı takımdaysa, tek başlarına sona kalırlarsa birlikte kazanırlar.
```

Bu oyunu ciddi karmaşıklaştırır.

### Önerilen tasarım

İlk sürümde:

```text
Aşıklar sadece ölüm bağı olsun.
Özel kazanma koşulu olmasın.
```

Sonra “Kaos Modu”nda özel kazanma koşulu aç.

### Oyuna etkisi

Aşıklar şu davranışları üretir:

```text
- Oyuncular birbirini korumaya çalışır.
- Bir oyuncu diğerini savununca şüphe doğar.
- Vampir/köylü bağı varsa iç çatışma başlar.
- Gündüz infazları daha riskli olur.
```

### Kaç kişide açılmalı?

| Oyuncu | Öneri |
|---:|---|
| 4–6 | Açma |
| 7–8 | Opsiyonel |
| 9+ | Açılabilir |
| 12+ | Çok iyi çalışır |

### Neden küçük oyunda açılmamalı?

6 kişide iki kişi birbirine bağlıysa toplam oyuncu havuzunun üçte biri tek mekanikle etkilenir. Bir ölüm iki ölümü tetikler, oyun hızlı kırılır.

### UI akışı

Rol dağıtımından sonra iki aşığa gizli bilgi ver:

```text
Aşık oldun.
Bağın: Leydi Ezmarelda
Biriniz ölürse diğeriniz de ölür.
```

Diğer oyuncular bunu bilmemeli.

Biri öldüğünde genel duyuru:

```text
Yusuf elendi.
Leydi Ezmarelda, aşk bağı yüzünden onun ardından gitti.
```

### Rol kartı metni

```text
AŞIK

Bir oyuncuya gizli bir bağ ile bağlısın.

Bağlı olduğun oyuncu ölürse sen de ölürsün.
Onu korumak isteyebilirsin ama fazla belli edersen ikiniz de hedef olabilirsiniz.
```

---

## 7. Ek rol önerileri

Sen Avcı, Belediye Başkanı, Gardiyan, Aşıklar dedin. Bunlar iyi. Ama ileride oyunu zenginleştirmek için şunlar da mantıklı.

### 7.1 Cadı

#### Kural

```text
Cadı oyun boyunca 1 kez birini kurtarabilir.
Oyun boyunca 1 kez birini öldürebilir.
```

#### Kaç kişide?

```text
10+ oyuncu
```

#### Risk

Çok güçlü. Başlangıçta ekleme.

### 7.2 Susturucu

#### Kural

```text
Bir oyuncu sonraki gündüz konuşamaz ama oy verebilir.
```

#### Kaç kişide?

```text
10+ oyuncu
```

#### Risk

Fiziksel ortamda uygulanması zor. Oyuncu gerçekten susmazsa sistem engelleyemez. Bu rol ancak oyuncu grubun kurala uyarsa çalışır.

### 7.3 Soytarı / Deli

#### Kural

```text
Gündüz asılırsa tek başına kazanır.
```

#### Kaç kişide?

```text
8+ oyuncu, Kaos Modu
```

#### Etki

Oyuncular “fazla şüpheli davranan kişi gerçekten vampir mi, yoksa asılmak mı istiyor?” diye düşünür.

Bu eğlenceli ama yeni oyuncular için karmaşık.

---

## 8. Kaç kişilik oyunda hangi roller açılmalı?

### Önerilen rol matrisi

| Oyuncu | Zorunlu roller | Opsiyonel roller | Açma |
|---:|---|---|---|
| 4 | 1 Vampir, 3 Köylü | Yok | Avcı, Aşıklar, Başkan, Gardiyan |
| 5 | 1 Vampir, 1 Dedektif, 3 Köylü | Doktor | Avcı, Aşıklar |
| 6 | 1 Vampir, 1 Dedektif, 1 Doktor, 3 Köylü | Avcı dikkatli | Aşıklar, Başkan, Gardiyan |
| 7 | 2 Vampir, 1 Dedektif, 1 Doktor, 3 Köylü | Avcı | Aşıklar dikkatli |
| 8 | 2 Vampir, 1 Dedektif, 1 Doktor, 4 Köylü | Avcı, Gardiyan | Başkan opsiyonel |
| 9 | 2 Vampir, 1 Dedektif, 1 Doktor, 5 Köylü | Avcı, Başkan, Aşıklar | Gardiyan opsiyonel |
| 10 | 2 Vampir, 1 Dedektif, 1 Doktor, 6 Köylü | Avcı, Başkan, Gardiyan | Aşıklar opsiyonel |
| 11–12 | 3 Vampir veya 2 Vampir + özel kötü rol | Avcı, Başkan, Gardiyan, Aşıklar | Cadı dikkatli |
| 13–15 | 3 Vampir | 2–4 özel rol | Susturucu, Soytarı opsiyonel |
| 16–20 | 3–4 Vampir | 4–6 özel rol | Kaos paketleri |

### Başlangıçta hangilerini aç?

İlk public test için:

```text
Aç:
- Köylü
- Vampir
- Dedektif
- Doktor
- Avcı

Kapalı tut:
- Gardiyan
- Belediye Başkanı
- Aşıklar
- Cadı
- Susturucu
- Soytarı
```

İkinci testte:

```text
Aç:
- Belediye Başkanı
- Gardiyan
```

Üçüncü testte:

```text
Aç:
- Aşıklar
```

Bu sırayla gidersen bug ve denge problemini izole edersin.

---

## 9. Adım adım projeye nasıl eklersin?

### Adım 1 — Rol registry oluştur

Rol bilgilerini hard-coded if/else içinde dağıtma. Merkezi role registry yap.

Örnek:

```ts
export const ROLE_DEFINITIONS = {
  villager: {
    id: "villager",
    name: "Köylü",
    team: "village",
    minPlayers: 4,
    phase: "passive",
  },
  vampire: {
    id: "vampire",
    name: "Vampir",
    team: "vampire",
    minPlayers: 4,
    phase: "night",
  },
  detective: {
    id: "detective",
    name: "Dedektif",
    team: "village",
    minPlayers: 5,
    phase: "night",
  },
  doctor: {
    id: "doctor",
    name: "Doktor",
    team: "village",
    minPlayers: 6,
    phase: "night",
  },
  hunter: {
    id: "hunter",
    name: "Avcı",
    team: "village",
    minPlayers: 7,
    phase: "onDeath",
  },
  guard: {
    id: "guard",
    name: "Gardiyan",
    team: "village",
    minPlayers: 8,
    phase: "day",
  },
  mayor: {
    id: "mayor",
    name: "Belediye Başkanı",
    team: "village",
    minPlayers: 9,
    phase: "passive",
  },
  lover: {
    id: "lover",
    name: "Aşık",
    team: "neutral",
    minPlayers: 9,
    phase: "passive",
  }
};
```

### Adım 2 — Rol paketleri oluştur

```ts
export const ROLE_PRESETS = {
  beginner: {
    name: "Başlangıç",
    roles: ["villager", "vampire", "detective", "doctor"]
  },
  classicPlus: {
    name: "Klasik+",
    roles: ["villager", "vampire", "detective", "doctor", "hunter"]
  },
  socialChaos: {
    name: "Sosyal Kaos",
    roles: ["villager", "vampire", "detective", "doctor", "hunter", "mayor", "guard", "lover"]
  }
};
```

Oda kurarken kullanıcıya önce paket seçtir.

### Adım 3 — Oyuncu sayısına göre otomatik dağıtım

Manuel rol sayısı yerine önce otomatik öner.

Örnek:

```ts
function buildRoleSet(playerCount: number, preset: RolePreset) {
  if (playerCount === 4) return ["vampire", "villager", "villager", "villager"];

  if (playerCount === 6) {
    return ["vampire", "detective", "doctor", "villager", "villager", "villager"];
  }

  if (playerCount === 8) {
    return ["vampire", "vampire", "detective", "doctor", "hunter", "villager", "villager", "villager"];
  }

  if (playerCount === 10) {
    return ["vampire", "vampire", "detective", "doctor", "hunter", "guard", "villager", "villager", "villager", "villager"];
  }
}
```

Başlangıçta net tabloyla git. Sonra ayar ekranına manuel özelleştirme eklersin.

### Adım 4 — Faz motoruna yeni eventler ekle

Şu an muhtemelen fazların var:

```text
night.vampire
night.detective
night.doctor
day.discussion
day.vote
day.result
```

Bunlara ekle:

```text
day.guard
day.mayorElection
onDeath.hunterShot
onDeath.loversChain
```

### Adım 5 — Ölüm pipeline’ı kur

Bunu özellikle düzgün yap. Çünkü Avcı ve Aşıklar ölüm zinciri yaratır.

Yanlış yaklaşım:

```ts
killPlayer(playerId);
checkGameEnd();
```

Doğru yaklaşım:

```ts
eliminatePlayer(playerId, reason);
resolveOnDeathEffects();
resolveLinkedDeaths();
checkGameEnd();
```

Ölüm sırası önemli:

```text
1. Oyuncu elendi
2. Avcı tetiklendi mi?
3. Aşık bağı tetiklendi mi?
4. Ek ölümler işlendi mi?
5. Son oyun durumu hesaplandı
```

### Adım 6 — UI’da rol bazlı aksiyon ekranı

Her rol için aynı component mantığı:

```tsx
<RoleActionScreen
  role="hunter"
  title="Avcı Son Nefes"
  description="Yanında götürmek istediğin oyuncuyu seç."
  selectablePlayers={alivePlayers}
/>
```

### Adım 7 — Logları role-event bazlı yap

Şu formatı kullan:

```json
{
  "event": "role.hunter.shot",
  "round": 2,
  "actorPlayerId": "p3",
  "targetPlayerId": "p7",
  "public": true
}
```

Aşıklar için:

```json
{
  "event": "role.lovers.chainDeath",
  "sourcePlayerId": "p3",
  "linkedPlayerId": "p5",
  "reason": "lover_died"
}
```

Bu ileride debug ve oyun sonu günlük için çok değerli olur.

---

## 10. Rol kartları UI’da nereye eklenmeli?

Mevcut ana menünde şu seçenekler var:

```text
Oda Kur
Odaya Katıl
Test Oyun
Oyunları Simüle Et
```

Buraya doğrudan **Roller** butonu ekle.

### Ana Menü önerisi

```text
Oda Kur
Odaya Katıl
Roller ve Kurallar
Test Oyun
```

“Test Oyun” ve “Oyunları Simüle Et” production’da gizli olmalı.

### Lobi içinde de rol rehberi olmalı

Lobi ekranında küçük bir bağlantı:

```text
Bu oyundaki roller
```

Tıklayınca sadece o oda için aktif olan roller görünmeli.

Örnek:

```text
Bu oyunda aktif roller:
- Vampir
- Köylü
- Dedektif
- Doktor
- Avcı
```

### Rol dağıtıldıktan sonra

Oyuncunun kendi rol ekranında:

```text
Rolünü Anladım
Rol Kurallarını Gör
```

### Setup tipleri

| Setup tipi | UI davranışı |
|---|---|
| Açık setup | Tüm aktif roller görünür |
| Yarı açık setup | Olası roller görünür |
| Kapalı setup | Sadece kendi rolün görünür |

Başlangıçta:

```text
Açık setup kullan.
```

Yani oyuncular bu oyunda hangi roller olduğunu bilsin. Yeni oyuncular için daha anlaşılır.

---

## 11. Rol kartı ekranında ne yazmalı?

Her rol kartı şu alanlardan oluşsun:

```text
Rol adı
Takım
Kısa açıklama
Ne zaman aksiyon alır?
Özel kurallar
Strateji ipucu
```

Örnek UI:

```text
AVCI
Takım: Köy

Gündüz elenirsen son nefesinde bir oyuncuyu yanında götürürsün.

Ne zaman aktif olur?
Gündüz oylamasıyla elendiğinde.

Dikkat:
Yanlış kişiyi seçersen köye zarar verebilirsin.

İpucu:
Rolünü erken açıklamak seni hedef haline getirebilir.
```

---

## 12. Kullanıcıya gösterilecek rol kartı metinleri

### Köylü

```text
KÖYLÜ

Takım: Köy

Özel bir gücün yok.
Ama oyunun en önemli silahı sende: gözlem, konuşma ve oy verme.

Gündüz tartışmalara katıl, çelişkileri yakala ve vampirleri bulmaya çalış.

Kazanma şartı:
Tüm vampirler elenirse köy kazanır.
```

### Vampir

```text
VAMPİR

Takım: Vampirler

Geceleri diğer vampirlerle birlikte bir oyuncuyu hedef alırsın.
Gündüz ise köylü gibi davranıp dikkat çekmemeye çalışırsın.

Kazanma şartı:
Vampirlerin sayısı köylülerle eşitlenirse veya üstün olursa vampirler kazanır.
```

### Dedektif

```text
DEDEKTİF

Takım: Köy

Her gece bir oyuncuyu sorgularsın.
Sorgu sonucunda o oyuncunun vampir olup olmadığını öğrenirsin.

Bu bilgi sadece sende görünür.
Gündüz açıklamak ya da saklamak senin kararın.

İpucu:
Çok erken açığa çıkarsan vampirlerin hedefi olabilirsin.
```

### Doktor

```text
DOKTOR

Takım: Köy

Her gece bir oyuncuyu korursun.
Koruduğun oyuncu o gece vampirler tarafından hedef alınırsa ölmez.

İpucu:
Kimi koruyacağını dikkatli seç.
Kendini korumak güvenli olabilir ama köyün önemli rollerini korumak oyunu çevirebilir.
```

### Avcı

```text
AVCI

Takım: Köy

Gündüz köy tarafından elenirsen son nefesinde bir oyuncuyu yanında götürürsün.

Bu güç çok tehlikelidir.
Doğru hedef vampiri bitirebilir, yanlış hedef köyü zayıflatır.

İpucu:
Avcı olduğunu söylemek seni koruyabilir ama vampirlerin dikkatini de çekebilir.
```

### Belediye Başkanı

```text
BELEDİYE BAŞKANI

Takım: Değişken / Makam

Başkan köy tarafından seçilir.
Başkanın gündüz oyu 2 sayılır.

Başkan köylü de olabilir, vampir de olabilir.
Bu yüzden başkana güvenmek oyuncuların kararıdır.

İpucu:
Yanlış başkan seçimi tüm köyü yanlış yöne sürükleyebilir.
```

### Gardiyan

```text
GARDİYAN

Takım: Köy

Oyun boyunca bir kez gündüz bir oyuncuyu koruyabilirsin.
Korunan oyuncu o gün oylamayla elenemez.

İpucu:
Dedektif olduğunu düşündüğün birini korumak oyunu kurtarabilir.
Ama vampiri korursan köye büyük zarar verebilirsin.
```

### Aşık

```text
AŞIK

Takım: Gizli bağ

Bir oyuncuya gizli bir bağ ile bağlısın.
Bağlı olduğun oyuncu ölürse sen de ölürsün.

Onu korumak isteyebilirsin ama fazla belli edersen ikiniz de hedef olabilirsiniz.

İpucu:
Aşk bağı bazen seni kendi takımınla çelişkiye düşürebilir.
```


## 13. En mantıklı uygulama sırası

```text
1. Rol rehberi ekranını ekle.
2. Avcı rolünü ekle.
3. Belediye Başkanı mekanizmasını ekle.
4. Gardiyanı ekle.
5. Aşıkları en son ekle.
```

Neden bu sıra?

```text
Avcı: En kolay ve dramatik.
Başkan: Sosyal oyunu güçlendirir.
Gardiyan: Stratejik koruma ekler.
Aşıklar: En kaotik olan, en son gelmeli.
```

İlk hedefin “çok rol” değil, **az ama net çalışan rol** olmalı. Aksi halde oyun gerçek insanlarda eğlenceli değil, yorucu olur.
