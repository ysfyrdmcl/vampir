import { buildRoleDeck } from "@vampir-koylu/shared";
import { describe, expect, it } from "vitest";

function count(deck: string[], role: string): number {
  return deck.filter((item) => item === role).length;
}

describe("role assignment table", () => {
  it("matches 4 players", () => {
    const deck = buildRoleDeck(4);
    expect(count(deck, "Vampire")).toBe(1);
    expect(count(deck, "Detective")).toBe(0);
    expect(count(deck, "Doctor")).toBe(0);
  });

  it("matches 5 players (1 vampire)", () => {
    const deck = buildRoleDeck(5);
    expect(count(deck, "Vampire")).toBe(1);
    expect(count(deck, "Detective")).toBe(1);
    expect(count(deck, "Doctor")).toBe(1);
  });

  it("matches 6 players (2 vampires)", () => {
    const deck = buildRoleDeck(6);
    expect(count(deck, "Vampire")).toBe(2);
    expect(count(deck, "Detective")).toBe(1);
    expect(count(deck, "Doctor")).toBe(1);
  });

  it("matches 8 players (2 vampires)", () => {
    const deck = buildRoleDeck(8);
    expect(count(deck, "Vampire")).toBe(2);
  });

  it("matches 7-9 players", () => {
    const deck = buildRoleDeck(9);
    expect(count(deck, "Vampire")).toBe(2);
  });

  it("matches 10-13 players", () => {
    const deck = buildRoleDeck(13);
    expect(count(deck, "Vampire")).toBe(3);
  });

  it("matches 14-17 players", () => {
    const deck = buildRoleDeck(17);
    expect(count(deck, "Vampire")).toBe(4);
  });

  it("matches 18-20 players", () => {
    const deck = buildRoleDeck(20);
    expect(count(deck, "Vampire")).toBe(4);
  });
});

