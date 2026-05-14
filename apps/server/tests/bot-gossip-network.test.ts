import { describe, expect, it, vi } from "vitest";
import { BotGossipNetwork } from "../src/bots/bot-gossip-network.js";
import type { BotEmbeddingResult, BotLLMChatRequest, BotLLMChatResult, BotLLMClient } from "../src/bots/bot-llm-client.js";

describe("BotGossipNetwork", () => {
  it("creates and lists normalized gossip", () => {
    const network = new BotGossipNetwork({}, { idFactory: () => "g1", now: () => 10 });
    const gossip = network.create("R1", "  P1 gece fazla sessizdi  ", { aboutPlayerId: "p1", tags: [" Suspicion "], spreadByBotId: "b1" });

    expect(gossip).toMatchObject({
      id: "g1",
      currentRumor: "P1 gece fazla sessizdi",
      tags: ["suspicion"],
      spreadByBotIds: ["b1"],
      createdAt: 10
    });
    expect(network.list("R1")).toHaveLength(1);
  });

  it("spreads gossip once per bot and can distort with LLM", async () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const network = new BotGossipNetwork({ llm: fakeLLM("Duydum ki P1 gece hic uyumamis.") }, { idFactory: () => "g1" });
    network.create("R1", "P1 gece ayaktaydi", { spreadByBotId: "b1" });

    const first = await network.spread("R1", "g1", "b2");

    expect(first?.spreadByBotIds).toEqual(["b1", "b2"]);
    expect(first?.distortion).toBe(0.3);

    const second = await network.spread("R1", "g1", "b3");
    expect(second?.currentRumor).toBe("Duydum ki P1 gece hic uyumamis.");
  });

  it("prunes old room gossip", () => {
    let now = 0;
    const network = new BotGossipNetwork({}, { maxGossipsPerRoom: 2, idFactory: () => `g${now}`, now: () => now++ });
    network.create("R1", "a");
    network.create("R1", "b");
    network.create("R1", "c");

    expect(network.list("R1").map((g) => g.currentRumor)).toEqual(["b", "c"]);
  });
});

function fakeLLM(text: string): BotLLMClient {
  return {
    async chat(_request: BotLLMChatRequest): Promise<BotLLMChatResult> {
      return { ok: true, text, model: "fake" };
    },
    async embed(_input: string): Promise<BotEmbeddingResult> {
      return { ok: false, reason: "disabled" };
    }
  };
}
