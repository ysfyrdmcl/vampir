/** Template strings only; server substitutes `{targetName}`. No LLM. */

export const BOT_SPEECH_POPUP_MS = 5200;

export const MAX_SPEECH_PER_BOT_PER_DAY = 2;

export function maxTotalBotSpeechPerPhase(botCount: number): number {
  return Math.min(6, Math.ceil(botCount * 1.5));
}

export function speechStaggerDelayMs(): number {
  return 1200 + Math.floor(Math.random() * (4500 - 1200 + 1));
}

export function renderTemplate(template: string, targetName: string): string {
  return template.replace(/\{targetName\}/g, targetName);
}

export function pickRandomLine(lines: readonly string[]): string {
  return lines[Math.floor(Math.random() * lines.length)] ?? "";
}

export const selfDefenseLines = [
  "Bana yüklenmeniz kolay ama gece olanlar benim işim değil.",
  "Benim üzerime gelmeniz vampirlerin işine yarıyor.",
  "Beni erken harcarsak köy zayıflar; biraz nefes alalım.",
  "Israrlı suçlama bana şüpheli geliyor; kim kazanıyor bakalım."
] as const;

export const accuseSoftLines = [
  "{targetName} bana fazla sessiz geliyor.",
  "Bence {targetName} bugün fazla kaçamak cevap verdi.",
  "{targetName} üzerinde bir tuhaflık hissediyorum, kötü niyet demiyorum.",
  "Gözüm {targetName} üzerinde; sebepsiz değil."
] as const;

export const supportSoftLines = [
  "{targetName} şu ana kadar daha tutarlı durdu bence.",
  "Bugün {targetName} tarafını biraz daha savunur gibiyim.",
  "{targetName} fazla suçlanıyor; emin değiliz daha."
] as const;

export const voteHintLines = [
  "Ben oyumu büyük ihtimalle {targetName} tarafına kullanacağım.",
  "Eğer köy dağılırsa ben {targetName} üzerinde düşünüyorum.",
  "Oylamada {targetName} benim listemde üst sıralarda."
] as const;

export const genericObservationLines = [
  "Bugün herkes çok gergin; biraz soğukkanlı olalım.",
  "Gece bilgisi olmadan yüzde yüz iddia etmek zor.",
  "Köy olarak acele karar verirsek pişman oluruz.",
  "Ben şimdilik gözlem modundayım.",
  "İlk turda çok sert olmayalım bence."
] as const;

/** Dedektif: kesin vampir iddiası yok, yumuşak yönlendirme. */
export const detectiveSoftLines = [
  "Bazı isimler üst üste biniyor; {targetName} tarafını bir kez daha düşünelim.",
  "{targetName} hakkında elimde net bir şey paylaşamam ama dikkat çekiyor.",
  "Ben {targetName} üzerinde ekstra dikkatli olurdum, başka bir şey demiyorum."
] as const;

/** Doktor: kimi koruduğunu vermez; genel risk. */
export const doctorVagueLines = [
  "Gece riskli geçti; gündüz oylarını iyi kullanalım.",
  "Koruma konusunda konuşmak bence doğru değil; köy stratejisi konuşsun.",
  "Ben rolümü açık etmeyeceğim; ama dikkatli olun."
] as const;

/** Vampir: takımı açık etmez; yanlış yönlendirme / genel gürültü. */
export const vampireMisdirectLines = [
  "Köy dağılırsa kazanan taraf belli olur; acele etmeyelim.",
  "Benim listemde bugün birkaç isim var; hepsi şüpheli değil tabii.",
  "Sessiz kalanlar tehlikeli olabilir; {targetName} bugün biraz öne çıktı."
] as const;
