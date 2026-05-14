import type { BotPersonality } from "@vampir-koylu/shared";
import { describe, expect, it } from "vitest";
import { BOT_PERSONALITY_CARDS, getBotPersonalityCard, renderBotPersonalityPrompt } from "../src/bots/bot-personality-cards.js";

const personalities: BotPersonality[] = ["quiet", "defensive", "accuser", "analyst", "chaotic", "leader"];

describe("bot personality cards", () => {
  it("defines one card for every shared BotPersonality", () => {
    expect(Object.keys(BOT_PERSONALITY_CARDS).sort()).toEqual([...personalities].sort());
    for (const personality of personalities) {
      const card = getBotPersonalityCard(personality);
      expect(card.archetype).toBe(personality);
      expect(card.catchphrases.length).toBeGreaterThanOrEqual(3);
      expect(card.boundaries.join(" ")).toContain("Gizli rol");
    }
  });

  it("keeps trait values inside the prompt scale", () => {
    for (const card of Object.values(BOT_PERSONALITY_CARDS)) {
      for (const value of Object.values(card.traits)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
      }
    }
  });

  it("renders a compact prompt block for LLM context", () => {
    const prompt = renderBotPersonalityPrompt(getBotPersonalityCard("analyst"));
    expect(prompt).toContain("Kimlik: Oy Izcisi");
    expect(prompt).toContain("Konusma tarzi:");
    expect(prompt).toContain("Sinirlar:");
    expect(prompt.length).toBeLessThan(900);
  });
});
