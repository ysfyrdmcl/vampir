import type { BotIntelligence, BotPersonality, BotSpeechIntent, GamePhase } from "@vampir-koylu/shared";

/** Template strings only; server substitutes placeholders. No LLM. */

export const BOT_SPEECH_POPUP_MS = 5200;

export const MAX_SPEECH_PER_BOT_PER_DAY = 2;
export const MAX_SPEECH_PER_BOT_PER_PHASE = 1;

export type SpeechTemplate = {
  id: string;
  intent: BotSpeechIntent;
  personalities?: BotPersonality[];
  intelligences?: BotIntelligence[];
  phases?: GamePhase[];
  requiresTarget?: boolean;
  text: string;
  tags?: string[];
};

export type SpeechTemplateValues = {
  speakerName: string;
  targetName?: string;
  phaseName: string;
  randomSoftener: string;
  randomJokeTail: string;
};

export function maxTotalBotSpeechPerPhase(botCount: number): number {
  return Math.min(3, Math.max(1, Math.ceil(botCount * 0.45)));
}

export function speechInitialDelayMs(): number {
  return 1200 + Math.floor(Math.random() * (2500 - 1200 + 1));
}

export function speechStaggerDelayMs(): number {
  return 1800 + Math.floor(Math.random() * (3200 - 1800 + 1));
}

export function pickRandomLine(lines: readonly string[]): string {
  return lines[Math.floor(Math.random() * lines.length)] ?? "";
}

export function renderSpeechTemplate(template: SpeechTemplate, values: SpeechTemplateValues): string {
  return template.text
    .replace(/\{speakerName\}/g, values.speakerName)
    .replace(/\{targetName\}/g, values.targetName ?? "")
    .replace(/\{phaseName\}/g, values.phaseName)
    .replace(/\{randomSoftener\}/g, values.randomSoftener)
    .replace(/\{randomJokeTail\}/g, values.randomJokeTail)
    .replace(/\s+/g, " ")
    .trim();
}

const DAY_PHASES: GamePhase[] = [
  "DayStart",
  "DayDiscussion",
  "MayorElection",
  "DayVote",
  "ExecutionResolve",
  "HunterLastBreath"
];

export const speechTemplates: SpeechTemplate[] = [
  {
    id: "small-quiet-watch",
    intent: "small_talk",
    personalities: ["quiet"],
    phases: DAY_PHASES,
    text: "Ben biraz daha izleyeceğim."
  },
  {
    id: "small-village-innocent",
    intent: "small_talk",
    phases: DAY_PHASES,
    text: "Bu köyde herkes masum olduğunu söylüyor; vampir de aynısını söyler zaten."
  },
  {
    id: "small-coffee",
    intent: "small_talk",
    personalities: ["chaotic"],
    phases: DAY_PHASES,
    text: "Ben kahvemi içmeden kimseyi asmak istemiyorum ama oyun beklemiyor."
  },
  {
    id: "chaos-door",
    intent: "chaos",
    personalities: ["chaotic"],
    phases: ["DayStart", "DayDiscussion"],
    text: "Gece kapımı çaldılar, korkudan yorganı kafama çektim{randomJokeTail}"
  },
  {
    id: "chaos-everyone",
    intent: "chaos",
    personalities: ["chaotic"],
    phases: DAY_PHASES,
    text: "Ben kimseyi suçlamıyorum, sadece herkes biraz suçlu duruyor."
  },
  {
    id: "accuse-silent",
    intent: "accuse_soft",
    personalities: ["accuser", "analyst", "leader"],
    phases: ["DayDiscussion", "DayVote"],
    requiresTarget: true,
    text: "{targetName} bana fazla sessiz geliyor."
  },
  {
    id: "accuse-odd",
    intent: "accuse_soft",
    phases: ["DayStart", "DayDiscussion", "DayVote"],
    requiresTarget: true,
    text: "Şimdilik net konuşmayayım ama {targetName} tarafında bir gariplik var."
  },
  {
    id: "accuse-too-calm",
    intent: "accuse_soft",
    personalities: ["accuser", "chaotic"],
    phases: ["DayDiscussion", "DayVote"],
    requiresTarget: true,
    text: "Ben kimseyi suçlamıyorum ama {targetName} bugün fazla rahat."
  },
  {
    id: "vote-likely",
    intent: "vote_hint",
    phases: ["DayVote", "DayDiscussion"],
    requiresTarget: true,
    text: "Ben oyumu büyük ihtimalle {targetName} tarafına kullanacağım."
  },
  {
    id: "vote-list",
    intent: "vote_hint",
    personalities: ["accuser", "analyst", "leader"],
    phases: ["DayVote"],
    requiresTarget: true,
    text: "{targetName} benim listemde üst sıraya çıktı."
  },
  {
    id: "mayor-steady",
    intent: "mayor_hint",
    phases: ["MayorElection"],
    requiresTarget: true,
    text: "Başkanlık için {targetName} daha dengeli duruyor gibi."
  },
  {
    id: "mayor-leader",
    intent: "mayor_hint",
    personalities: ["leader", "analyst"],
    phases: ["MayorElection"],
    requiresTarget: true,
    text: "Dağılmayalım; başkanlıkta {targetName} üstünden düşünelim."
  },
  {
    id: "analysis-vote-spread",
    intent: "analysis",
    personalities: ["analyst", "leader"],
    intelligences: ["balanced", "deceptive"],
    phases: ["DayDiscussion", "DayVote"],
    requiresTarget: true,
    text: "Dünkü oy havasına bakınca {targetName} biraz ayrışıyor."
  },
  {
    id: "analysis-not-random",
    intent: "analysis",
    personalities: ["analyst"],
    intelligences: ["balanced", "deceptive"],
    phases: ["DayVote", "DayDiscussion"],
    requiresTarget: true,
    text: "Rastgele oy yerine {targetName} üstünden konuşalım."
  },
  {
    id: "defense-easy",
    intent: "self_defense",
    personalities: ["defensive"],
    phases: DAY_PHASES,
    text: "Bana yüklenmeniz kolay ama bu sizi haklı yapmaz."
  },
  {
    id: "defense-vampire-benefit",
    intent: "self_defense",
    personalities: ["defensive", "quiet"],
    phases: DAY_PHASES,
    text: "Üstüme bu kadar hızlı gelinmesi bana temiz görünmedi."
  },
  {
    id: "support-consistent",
    intent: "support_soft",
    phases: ["DayDiscussion", "MayorElection"],
    requiresTarget: true,
    text: "{targetName} bugün bana daha tutarlı geldi."
  },
  {
    id: "support-no-problem",
    intent: "support_soft",
    personalities: ["defensive", "leader"],
    phases: ["DayDiscussion", "MayorElection"],
    requiresTarget: true,
    text: "Şimdilik {targetName} tarafında büyük bir sorun görmüyorum."
  },
  {
    id: "detective-soft",
    intent: "accuse_soft",
    phases: ["DayDiscussion", "DayVote"],
    requiresTarget: true,
    text: "Ben {targetName} üzerinde ekstra dikkatli olurdum, başka bir şey demiyorum.",
    tags: ["detective_safe"]
  },
  {
    id: "doctor-vague-risk",
    intent: "generic_observation",
    phases: ["DayStart", "DayDiscussion"],
    text: "Gece riskli geçti; gündüz oylarını iyi kullanalım.",
    tags: ["doctor_safe"]
  },
  {
    id: "doctor-no-claim",
    intent: "generic_observation",
    phases: ["DayDiscussion"],
    text: "Geceyi açık etmeyelim; bugün oy düzenine bakalım.",
    tags: ["doctor_safe"]
  },
  {
    id: "vampire-misdirect",
    intent: "accuse_soft",
    intelligences: ["balanced", "deceptive"],
    phases: ["DayDiscussion", "DayVote"],
    requiresTarget: true,
    text: "Sessiz kalanlar tehlikeli olabilir; {targetName} bugün biraz öne çıktı.",
    tags: ["vampire_safe"]
  },
  {
    id: "tie-reaction",
    intent: "tie_reaction",
    phases: ["ExecutionResolve"],
    text: "Oylar böyle bölünürse kimse rahat uyuyamaz."
  },
  {
    id: "execution-reaction",
    intent: "execution_reaction",
    phases: ["ExecutionResolve"],
    text: "Bu kararın köyü nereye götüreceğini sabah göreceğiz."
  },
  {
    id: "hunter-reaction",
    intent: "hunter_reaction",
    phases: ["HunterLastBreath"],
    text: "Avcının son sözü hafife alınmaz; herkes sakin kalsın."
  },
  {
    id: "flavor-door-knock-1",
    intent: "small_talk",
    personalities: ["chaotic", "quiet"],
    phases: ["DayStart", "DayDiscussion"],
    text: "Gece kapımı üç kere çaldılar. Açmadım. Bu köyde nezaket de vampirlik kadar şüpheli."
  },
  {
    id: "flavor-everyone-innocent-1",
    intent: "small_talk",
    personalities: ["chaotic", "accuser"],
    phases: ["DayDiscussion"],
    text: "Herkes masum olduğunu söylüyor. Vampir de zaten başka ne diyecekti?"
  },
  {
    id: "flavor-silent-grave-1",
    intent: "small_talk",
    personalities: ["quiet", "analyst"],
    phases: ["DayStart", "DayDiscussion"],
    text: "Bu sabah köy fazla sessiz. Mezarlık bile bizden daha dürüst duruyor."
  },
  {
    id: "accuse-invisible-1",
    intent: "accuse_soft",
    personalities: ["accuser", "analyst"],
    phases: ["DayDiscussion", "DayVote"],
    requiresTarget: true,
    text: "{targetName} bugün fazla görünmez kaldı. Bu oyunda görünmezlik bazen en gürültülü şeydir."
  },
  {
    id: "accuse-too-calm-1",
    intent: "accuse_soft",
    personalities: ["accuser", "leader"],
    phases: ["DayDiscussion", "DayVote"],
    requiresTarget: true,
    text: "{targetName} fazla sakin. Köy yanarken bu kadar rahat durmak bana normal gelmiyor."
  },
  {
    id: "accuse-answer-gap-1",
    intent: "accuse_soft",
    personalities: ["analyst", "accuser"],
    phases: ["DayDiscussion"],
    requiresTarget: true,
    text: "{targetName} cevap veriyor ama hiçbir şeyi gerçekten açıklamıyor. Bunu not ediyorum."
  },
  {
    id: "accuse-shadow-follow-1",
    intent: "accuse_soft",
    personalities: ["accuser"],
    intelligences: ["deceptive"],
    phases: ["DayDiscussion", "DayVote"],
    requiresTarget: true,
    text: "{targetName} oyların gölgesinde yürümeyi seviyor gibi. Fazla temiz görünmek de kirli olabilir."
  },
  {
    id: "vote-likely-target-1",
    intent: "vote_hint",
    personalities: ["leader", "accuser"],
    phases: ["DayVote"],
    requiresTarget: true,
    text: "Ben oyumu büyük ihtimalle {targetName} tarafına kullanacağım. İçime en az sinmeyen kişi o."
  },
  {
    id: "vote-dont-split-1",
    intent: "vote_hint",
    personalities: ["leader", "analyst"],
    phases: ["DayVote"],
    requiresTarget: true,
    text: "Oyları dağıtırsak geceyi vampirler kazanır. Ben {targetName} üstünden gitmeyi düşünüyorum."
  },
  {
    id: "vote-last-look-1",
    intent: "vote_hint",
    personalities: ["quiet", "analyst"],
    phases: ["DayVote"],
    requiresTarget: true,
    text: "Son kez düşünüyorum ama oyum {targetName} tarafına kayıyor. Bazı sessizlikler fazla düzenli."
  },
  {
    id: "analysis-pattern-1",
    intent: "analysis",
    personalities: ["analyst", "leader"],
    phases: ["DayDiscussion"],
    requiresTarget: true,
    text: "{targetName} ne zaman konu değişse rahatlıyor. Tesadüf olabilir, ama bu köyde tesadüf pahalıdır."
  },
  {
    id: "analysis-vote-memory-1",
    intent: "analysis",
    personalities: ["analyst"],
    phases: ["DayDiscussion", "DayVote"],
    requiresTarget: true,
    text: "{targetName} dün çok ortada görünmeden yön değiştirdi. Ben bu tarz hamleleri masum bulmuyorum."
  },
  {
    id: "analysis-panic-vs-silence-1",
    intent: "analysis",
    personalities: ["analyst", "leader"],
    phases: ["DayDiscussion"],
    text: "En çok panik yapan değil, panik olmaması gereken yerde susan kişi daha tehlikeli olabilir."
  },
  {
    id: "defense-easy-target-1",
    intent: "self_defense",
    personalities: ["defensive"],
    phases: ["DayDiscussion", "DayVote"],
    text: "Bana yüklenmek kolay. Asıl soru şu: Bu kolay hedefi kim bu kadar hızlı önünüze koydu?"
  },
  {
    id: "defense-vampire-benefit-1",
    intent: "self_defense",
    personalities: ["defensive", "analyst"],
    phases: ["DayDiscussion", "DayVote"],
    text: "Benim üstüme gelişiniz fazla aceleci. Bu telaşın kaynağını konuşalım."
  },
  {
    id: "chaos-mirror-1",
    intent: "chaos",
    personalities: ["chaotic"],
    phases: ["DayDiscussion"],
    text: "Bu köyde herkes birbirine bakıyor. Ben aynaya baktım, o bile benden şüphelendi."
  },
  {
    id: "chaos-tea-vampire-1",
    intent: "chaos",
    personalities: ["chaotic"],
    intelligences: ["deceptive"],
    phases: ["DayDiscussion"],
    text: "Vampir aramızda çay içiyor olabilir. Şekeri kaç attığını sorarsak belki yakalarız."
  },
  {
    id: "mayor-calm-choice-1",
    intent: "mayor_hint",
    personalities: ["leader", "analyst"],
    phases: ["MayorElection"],
    requiresTarget: true,
    text: "Başkanlık için {targetName} düşünülebilir. Panik anında köyü dağıtmayacak biri lazım."
  },
  {
    id: "tie-bad-smell-1",
    intent: "tie_reaction",
    personalities: ["leader", "accuser", "analyst"],
    phases: ["DayDiscussion", "DayVote"],
    text: "Bu beraberlik kötü kokuyor. Vampirler karar veremeyen köyleri sever."
  },
  {
    id: "execution-cold-ending-1",
    intent: "execution_reaction",
    personalities: ["quiet", "analyst", "leader"],
    phases: ["ExecutionResolve"],
    text: "Karar verildi. Eğer yanıldıysak, gece bunu bize sessizce hatırlatacak."
  },
  {
    id: "chaos-vampires-inactive-1",
    intent: "chaos",
    personalities: ["chaotic", "accuser"],
    phases: ["DayStart", "DayDiscussion"],
    text: "Bu oyundaki vampirler insan kanı sevmiyor galiba, hiç aktif değiller."
  },
  {
    id: "chaos-suspicious-of-myself-1",
    intent: "chaos",
    personalities: ["chaotic", "quiet"],
    phases: ["DayDiscussion"],
    text: "Herkesten şüpheleniyorum, bazen kendimden de. Arada kartıma bakıyorum."
  },
  {
    id: "chaos-doctor-distance-learning-1",
    intent: "chaos",
    personalities: ["chaotic"],
    phases: ["DayStart", "ExecutionResolve"],
    text: "Doktor uzaktan eğitim galiba, sürekli biri ölüyor."
  },
  {
    id: "mayor-spotlight-vampire-suspicion-1",
    intent: "mayor_hint",
    personalities: ["accuser", "analyst"],
    phases: ["MayorElection", "DayDiscussion"],
    requiresTarget: true,
    text: "{targetName} belediye başkanı olmak için çok göz önünde duruyor, vampir olabilir."
  },
  {
    id: "chaos-detective-sherlock-1",
    intent: "chaos",
    personalities: ["chaotic", "analyst"],
    phases: ["DayStart", "DayDiscussion"],
    text: "Dedektif Sherlock galiba, hiç konuşmadan olayı çözdü."
  },
  {
    id: "chaos-vampire-sunscreen-1",
    intent: "chaos",
    personalities: ["chaotic", "accuser"],
    phases: ["DayDiscussion", "DayVote"],
    text: "Vampir arıyorsak güneş kremi kokanlara bakalım. Bu köyde gececilik biraz fazla yaygın."
  },
  {
    id: "chaos-villager-pitchfork-1",
    intent: "chaos",
    personalities: ["chaotic"],
    phases: ["DayStart", "DayDiscussion"],
    text: "Köylülerin elinde dirgen var ama plan yok. Bu enerjiyle samanlığı bile yanlış suçlarız."
  },
  {
    id: "chaos-guard-handsome-security-1",
    intent: "chaos",
    personalities: ["chaotic"],
    phases: ["DayStart", "DayDiscussion"],
    text: "Bizim gardiyan yakışıklı güvenlik galiba, vampirler köyde volta atıyor."
  },
  {
    id: "chaos-garlic-denial-1",
    intent: "chaos",
    personalities: ["chaotic"],
    intelligences: ["deceptive"],
    phases: ["DayDiscussion", "DayVote"],
    text: "Yeni sarımsak ektim, kesinlikle vampir değilim."
  }
];

export const randomSofteners = ["bence", "şimdilik", "galiba", "açıkçası"] as const;
export const randomJokeTails = [" hahaha.", ".", " vallahi.", ", neyse."] as const;
