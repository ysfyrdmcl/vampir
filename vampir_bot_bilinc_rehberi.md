# Vampir Koylu Bot Bilinc Rehberi

Bu rehber, `AI_NPC_Bilinc_Rehberi.md` dosyasindaki yaklasimi Vampir Koylu projesine uyarlayan gelistirme planidir.

Hedef artik yalnizca template/skor tabanli bot degil; LLM, embedding, uzun sureli hafiza, kisilik kartlari, oyun bilinci ve botlar arasi etkilesim kullanan daha canli bir bot/NPC bilinc sistemidir.

## Hedef

Her botun:

```text
Kendine ait kisilik karti olsun.
Oyun fazini, rolu, public olaylari ve kendi gizli bilgisini bilsin.
Kisa sureli ve uzun sureli hafizasi olsun.
Oyuncular ve diger botlar hakkinda iliski/tutum gelistirsin.
LLM ile kisa, dogal ve role uygun konussun.
Embedding ile eski ama ilgili anilari geri cagirabilsin.
Bot-bot etkilesimi ve dedikodu uretebilsin.
Oyun aksiyonlarinda yine legal validator yolunu kullansin.
```

## Ana Kararlar

```text
LLM/API kullanilacak.
Embedding kullanilacak.
Dis servis kullanilabilir.
OpenAI veya benzeri model saglayicilari desteklenebilir.
Uzun sureli hafiza icin vector store veya local embedding store kullanilabilir.
Template sistemi fallback/cache katmani olarak kalabilir.
Mobile karar vermez; mobile sadece server eventlerini gosterir.
Oyun aksiyonlari server validator yolundan gecmeye devam eder.
```

## Onerilen Teknoloji Katmani

| Bilesen | Oneri | Not |
|---|---|---|
| LLM | OpenAI chat model veya uyumlu provider | Konusma, ozet, dedikodu carpıtma |
| Embedding | `text-embedding-3-small` veya multilingual local model | Turkce recall icin |
| Local embedding alternatifi | `@xenova/transformers` | Offline/ucuz mod |
| Vector store MVP | JSON + cosine similarity | Baslangic icin yeterli |
| Vector store ileri | SQLite + sqlite-vss / pgvector | Daha sonra |
| Cache | In-memory TTL cache | Tekrar prompt maliyetini azaltir |
| Scheduler | Server-side queue | Faz basina LLM sayisini sinirlar |

## Mevcut Mimariyle Entegrasyon

Mevcut sistem korunacak ama yeni bilinc katmani eklenecek:

```text
GameEngine
  -> legal phase/action/rule authority

BotActionEngine
  -> botun ne zaman aksiyon yapacagini zamanlar
  -> hedef kararinda Brain/Memory sinyalinden yararlanabilir
  -> submitAction yolunu kullanir

BotBrainController
  -> kisilik, world awareness, memory recall, LLM karar/konusma katmani

BotMemoryStore
  -> kisa sureli state + skorlar

BotLongTermMemory
  -> embedding tabanli uzun sureli anilar

BotSpeechEngine
  -> LLM konusmasini uretir
  -> cache/fallback template kullanir

Mobile
  -> sadece room state, bot speech, history ve UI
```

## Dosya Yapisi Onerisi

```text
apps/server/src/bots/
  bot-brain-controller.ts
  bot-personality-cards.ts
  bot-world-awareness.ts
  bot-short-term-memory.ts
  bot-long-term-memory.ts
  bot-embedding-store.ts
  bot-llm-client.ts
  bot-response-cache.ts
  bot-gossip-network.ts
  bot-interaction-scheduler.ts
  bot-action-engine.ts
  bot-targeting.ts
  bot-memory.ts
  bot-speech-engine.ts
  bot-speech-templates.ts

apps/server/src/config/
  env.ts

apps/server/tests/
  bot-brain-controller.test.ts
  bot-memory-recall.test.ts
  bot-world-awareness.test.ts
  bot-llm-prompt.test.ts
```

## 1. Kisilik Sistemi

Her bot icin sabit bir kisilik karti olacak.

```typescript
type BotPersonalityCard = {
  id: string;
  displayName: string;
  archetype: BotPersonality;
  roleplay: string;
  traits: {
    humor: number;
    sarcasm: number;
    friendliness: number;
    curiosity: number;
    gossip: number;
    bravery: number;
    deception: number;
  };
  speechStyle: string;
  catchphrases: string[];
  boundaries: string[];
};
```

Ornek:

```typescript
{
  id: "sisli_koylu",
  displayName: "Sisli Koylu",
  archetype: "quiet",
  roleplay: "Koyde uzun zamandir yasayan, az konusan ama detaylari kacirmayan biri.",
  traits: {
    humor: 3,
    sarcasm: 4,
    friendliness: 5,
    curiosity: 6,
    gossip: 3,
    bravery: 4,
    deception: 2
  },
  speechStyle: "Kisa, temkinli, dogrudan. Kesin hukum vermekten kacinir.",
  catchphrases: ["Bunu not edelim.", "Fazla sessiz.", "Sabaha bakariz."],
  boundaries: [
    "Gizli rol bilgisini dogrudan soyleme.",
    "Iki cumleden uzun konusma.",
    "Oyun disi referans verme."
  ]
}
```

## 2. Hafiza Sistemi

Hafiza iki katmanli olacak.

### Kisa Sureli Hafiza

Server RAM icinde tutulur. Faz icindeki yakin olaylari ve son konusmalari tasir.

```typescript
type BotShortTermMemoryEntry = {
  timestamp: number;
  type: "dialogue" | "event" | "observation" | "action";
  actorPlayerId?: string;
  targetPlayerId?: string;
  content: string;
  emotion?: "neutral" | "suspicious" | "afraid" | "amused" | "confident";
  importance: number;
};
```

Kurallar:

```text
Bot basina son 15-20 entry tutulur.
Faz degisiminde onemsiz entryler atilir.
Onemli entryler uzun sureli hafizaya ozetlenerek aktarilir.
```

### Uzun Sureli Hafiza

Embedding ile saklanir ve ilgili durumda recall edilir.

```typescript
type BotLongTermMemoryEntry = {
  id: string;
  roomCode: string;
  botPlayerId: string;
  content: string;
  embedding: number[];
  importance: number;
  tags: string[];
  createdAt: number;
  expiresAt?: number;
};
```

Recall:

```text
Prompt hazirlanmadan once query olusturulur.
Embedding uretilir.
Botun kendi anilari + global oda anilari arasinda cosine similarity hesaplanir.
Top 3-5 ani LLM context'ine eklenir.
```

Baslangic limiti:

```text
Bot basina max 200 uzun sureli ani.
Recall topK: 3.
Tek aninin ozeti max 240 karakter.
```

## 3. Oyun Bilinci

LLM'e ham game state verilmez; guvenli ve ozetlenmis world context verilir.

```typescript
type BotWorldAwareness = {
  phase: GamePhase;
  round: number;
  speaker: {
    playerId: string;
    nickname: string;
    role?: Role;
    isAlive: boolean;
  };
  publicPlayers: {
    playerId: string;
    nickname: string;
    isAlive: boolean;
    isBot: boolean;
  }[];
  publicEvents: string[];
  privateFacts: string[];
  legalActionHints: string[];
};
```

Guvenlik:

```text
Vampir olmayan botlara vampir listesi verilmez.
Dedektif sonucu sadece dedektif botun privateFacts alanina girer.
Doctor/gardiyan bilgisi dogrudan ifsa edilmez.
LLM ciktisi aksiyon validator'i bypass edemez.
```

## 4. LLM Prompt Yapisi

LLM cagrisi kisa ve sinirli tutulur.

```text
SYSTEM:
Sen Vampir Koylu oyununda bir bot karaktersin.
Karakter kartina sadik kal.
Oyun disi konusma.
Gizli rol bilgisini dogrudan ifsa etme.
En fazla 1-2 cumle yaz.
Turkce yaz.

PERSONALITY:
{personalityCard}

WORLD:
{safeWorldAwareness}

MEMORY:
{shortTermMemory}
{recalledLongTermMemories}

TASK:
Bu fazda kisa ve dogal bir replik uret.
Intent: {intent}
Target: {targetName}
Tone: {tone}
```

Structured output tercih edilir:

```typescript
type BotLLMSpeechResponse = {
  message: string;
  tone: BotSpeechTone;
  intent: BotSpeechIntent;
  targetPlayerId?: string;
  emotion?: string;
  memoryWrite?: {
    content: string;
    importance: number;
    tags: string[];
  };
};
```

## 5. Konusma Uretimi

Yeni akis:

```text
BotSpeechEngine fazda konusacak botu secer.
BotBrainController context hazirlar.
Short memory + long memory recall eklenir.
LLM cagrilir.
Response guard ile kontrol edilir.
Uygunsa GAME_BOT_SPEECH emit edilir.
Memory write varsa hafizaya yazilir.
LLM hata verirse template fallback kullanilir.
```

Response guard:

```text
Bos mesaj reddedilir.
2 cumleden uzun mesaj kisaltilir veya fallback'e dusurulur.
Gizli rol ifsasi yakalanirsa fallback kullanilir.
Oyun disi/API/model referansi yakalanirsa fallback kullanilir.
```

## 6. Bot-Bot Etkilesimi ve Dedikodu

Botlar oyuncudan bagimsiz mikro etkilesimler kurabilir.

Tetikleyiciler:

```text
shared_event: Ayni public olayi gorduler.
accusation_response: Bir bot digerinin hedefini destekler veya sorgular.
gossip_timer: Faz basina dusuk ihtimalle dedikodu.
relationship_shift: Trust/suspicion skoru belirgin degisti.
```

Kisitlar:

```text
Mikro zincir max 2-3 replik.
Faz basina toplam LLM cagrisi sinirli.
Global serbest chat eklenmez; mevcut speech event hattindan akar.
Dedikodu public bilgi veya botun kendi private bilgisine gore guvenli sekilde uretilir.
```

Dedikodu modeli:

```typescript
type BotGossip = {
  id: string;
  aboutPlayerId?: string;
  originalFact: string;
  currentRumor: string;
  spreadByBotIds: string[];
  distortion: number;
  tags: string[];
};
```

## 7. Aksiyon Karari

LLM hedef secimine yardimci olabilir ama son karar legal target filtresinden gecmek zorunda.

Akis:

```text
legalTargetsForBot() hedef havuzunu uretir.
BotBrainController hedef icin gerekce/skor isteyebilir.
LLM veya memory sinyali target ranking'e eklenir.
pickBotTargetOrder() final siralamayi yapar.
submitGameAction() validator yolundan gecirir.
```

Kabul:

```text
LLM legal olmayan hedef onerirse yok sayilir.
LLM cevap vermezse mevcut skor/template sistemi fallback olur.
Bot dogrudan state mutate etmez.
```

## 8. Performans ve Maliyet

Ilk limitler:

```text
Faz basina max 3 bot speech LLM cagrisi.
Bot basina gunluk max 2 speech.
Recall topK max 3.
Response cache TTL 60 saniye.
LLM timeout 4-6 saniye.
Timeout durumunda fallback template.
```

Cache key:

```text
botId + phase + intent + targetId + memoryHash + worldHash
```

Env:

```text
BOT_LLM_ENABLED=true
BOT_LLM_PROVIDER=openai
BOT_LLM_MODEL=...
BOT_EMBEDDING_ENABLED=true
BOT_EMBEDDING_MODEL=text-embedding-3-small
BOT_LLM_MAX_CALLS_PER_PHASE=3
BOT_LLM_TIMEOUT_MS=6000
```

## Gelistirme Plani

### BOT-I: LLM Client ve Config

Amac: Dis servis/LLM cagrilarini tek soyutlama altina almak.

Dosyalar:

```text
apps/server/src/bots/bot-llm-client.ts
apps/server/src/config/env.ts
apps/server/tests/bot-llm-client.test.ts
```

Kabul kriteri:

```text
LLM provider env ile acilip kapanir.
Timeout ve hata durumunda kontrollu fallback doner.
Testlerde gercek API cagrisi yapilmaz; mock kullanilir.
```

### BOT-J: Kisilik Kartlari

Amac: BotPersonality type'larini detayli kisilik kartlarina baglamak.

Dosyalar:

```text
apps/server/src/bots/bot-personality-cards.ts
apps/server/src/bots/bot-names.ts
apps/server/tests/bot-personality-cards.test.ts
```

Kabul kriteri:

```text
Her BotPersonality icin kart vardir.
Her bot olusturulurken kart secimi deterministik test edilebilir.
Kartlar prompt'a kisa ozet olarak girer.
```

### BOT-K: Short-Term Memory

Amac: Son olay/konusma/aksiyonlari sliding window olarak tutmak.

Dosyalar:

```text
apps/server/src/bots/bot-short-term-memory.ts
apps/server/src/bots/bot-memory.ts
apps/server/tests/bot-short-term-memory.test.ts
```

Kabul kriteri:

```text
Bot basina max entry limiti calisir.
Onemli entryler long-term adayina donusur.
Ham sinirsiz log tutulmaz.
```

### BOT-L: Embedding ve Long-Term Memory

Amac: Onemli anilari embedding ile saklamak ve recall etmek.

Dosyalar:

```text
apps/server/src/bots/bot-embedding-store.ts
apps/server/src/bots/bot-long-term-memory.ts
apps/server/tests/bot-long-term-memory.test.ts
```

Kabul kriteri:

```text
Embedding client mocklanabilir.
Cosine similarity ile topK recall calisir.
Bot basina memory limiti korunur.
Recall sadece ilgili bot/oda anilarini getirir.
```

### BOT-M: World Awareness Builder

Amac: Game state'i LLM icin guvenli ozet haline getirmek.

Dosyalar:

```text
apps/server/src/bots/bot-world-awareness.ts
apps/server/tests/bot-world-awareness.test.ts
```

Kabul kriteri:

```text
Public bilgiler herkese gider.
Private bilgiler sadece ilgili role gider.
Vampir olmayan bot vampir listesini gormez.
Dedektif sonucu sadece dedektif bot context'ine girer.
```

### BOT-N: LLM Speech Engine

Amac: Bot konusmalarini LLM ile uretmek, template'i fallback olarak tutmak.

Dosyalar:

```text
apps/server/src/bots/bot-brain-controller.ts
apps/server/src/bots/bot-speech-engine.ts
apps/server/src/bots/bot-response-cache.ts
apps/server/tests/bot-speech-engine.test.ts
```

Kabul kriteri:

```text
LLM enabled ise speech LLM'den gelir.
LLM disabled/error/timeout ise mevcut template fallback calisir.
Response guard gizli rol ifsasi ve uzun cevaplari engeller.
Speech event formatina uyum korunur.
```

### BOT-O: Bot-Bot Etkilesimi ve Dedikodu

Amac: Botlar arasi kisa reaksiyon ve dedikodu zincirleri olusturmak.

Dosyalar:

```text
apps/server/src/bots/bot-gossip-network.ts
apps/server/src/bots/bot-interaction-scheduler.ts
apps/server/src/bots/bot-speech-engine.ts
apps/server/tests/bot-gossip-network.test.ts
```

Kabul kriteri:

```text
Faz basina LLM cagrisi limiti asilmaz.
Max 2-3 repliklik zincir uretilir.
Dedikodu public/güvenli context disina cikmaz.
Memory'ye ozet olarak yazilir.
```

### BOT-P: LLM Destekli Target Ranking

Amac: LLM ve memory sinyallerini hedef siralamasina yardimci sinyal olarak eklemek.

Dosyalar:

```text
apps/server/src/bots/bot-targeting.ts
apps/server/src/bots/bot-brain-controller.ts
apps/server/tests/bot-targeting.test.ts
```

Kabul kriteri:

```text
Legal target filtresi her zaman once calisir.
LLM legal olmayan hedef onerirse yok sayilir.
Fallback skor sistemi korunur.
Validator bypass edilmez.
```

## Agent Calisma Protokolu

Her fazda:

```text
Once git status al.
Sadece ilgili faz dosyalarini oku.
LLM ve embedding client'lari testte mockla.
Gercek API anahtari repo'ya yazma.
Env orneklerini .env.example icinde dokumante et.
Mobile tarafina server-only memory gonderme.
Her faz sonunda server build/test calistir.
Finalde degisen dosyalar, test sonucu ve sonraki fazi yaz.
```

Onerilen komutlar:

```bash
npm run build:shared
npm run build -w apps/server
npm run test -w apps/server
```

## Yapilmamasi Gerekenler

```text
API key commit etme.
LLM yanitiyla dogrudan game state mutate etme.
LLM yanitiyla validator bypass etme.
Gizli rol bilgisini herkese acma.
Sinirsiz ham konusma logu saklama.
Faz basina limitsiz LLM cagrisi yapma.
Client tarafinda bot hedefi uretme.
```

## Kisa Ozet

Bu planda bot bilinci, verilen NPC rehberindeki teknolojileri kullanir:

```text
LLM
embedding
kisa sureli hafiza
uzun sureli hafiza
world awareness
response cache
scheduler
dedikodu/ag etkilesimi
```

Ancak oyun butunlugu icin su sinir korunur:

```text
LLM karakteri ve yorumu zenginlestirir.
GameEngine ve validator oyun kurallarinin otoritesi olmaya devam eder.
```
