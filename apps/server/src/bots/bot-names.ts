const BASE_NAMES = [
  "Kont Drakula",
  "Sisli Köylü",
  "Gece Bekçisi",
  "Solgun Misafir",
  "Karanlık Yolcu",
  "Kuzgun Bakış",
  "Şüpheli Adam",
  "Eski Muhtar",
  "Ay Işığı",
  "Sessiz Doktor",
  "Pus Eli",
  "Kül Avcısı",
  "Kara Vaiz",
  "Tunç Yüzlü",
  "Loş Konuk"
];

const ROMAN_SUFFIXES = ["II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function pickUnusedBotName(usedNames: ReadonlySet<string>): string {
  for (const name of BASE_NAMES) {
    if (!usedNames.has(name)) return name;
  }
  for (const suffix of ROMAN_SUFFIXES) {
    for (const base of BASE_NAMES) {
      const candidate = `${base} ${suffix}`;
      if (!usedNames.has(candidate)) return candidate;
    }
  }
  let counter = 1;
  while (true) {
    const candidate = `Bot #${counter}`;
    if (!usedNames.has(candidate)) return candidate;
    counter += 1;
  }
}

const PERSONALITY_BY_INTELLIGENCE = {
  random: ["chaotic", "quiet"] as const,
  balanced: ["analyst", "defensive"] as const,
  deceptive: ["accuser", "leader", "defensive"] as const
};

export function pickBotPersonality(intelligence: keyof typeof PERSONALITY_BY_INTELLIGENCE): "quiet" | "defensive" | "accuser" | "analyst" | "chaotic" | "leader" {
  const pool = PERSONALITY_BY_INTELLIGENCE[intelligence];
  return pool[Math.floor(Math.random() * pool.length)];
}
