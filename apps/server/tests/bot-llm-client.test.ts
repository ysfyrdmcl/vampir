import { describe, expect, it } from "vitest";
import { createBotLLMClient, type BotLLMClientConfig } from "../src/bots/bot-llm-client.js";

const baseConfig: BotLLMClientConfig = {
  llmEnabled: true,
  embeddingEnabled: true,
  provider: "openai",
  apiKey: "test-key",
  chatModel: "gpt-test",
  embeddingModel: "embed-test",
  timeoutMs: 1000
};

describe("BotLLMClient", () => {
  it("returns disabled when chat generation is off", async () => {
    const client = createBotLLMClient({ ...baseConfig, llmEnabled: false }, mockFetch({}));
    await expect(client.chat({ messages: [{ role: "user", content: "Selam" }] })).resolves.toEqual({
      ok: false,
      reason: "disabled"
    });
  });

  it("requires an API key when enabled", async () => {
    const client = createBotLLMClient({ ...baseConfig, apiKey: undefined }, mockFetch({}));
    const result = await client.chat({ messages: [{ role: "user", content: "Selam" }] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("configuration_error");
  });

  it("posts chat completions and reads the assistant text", async () => {
    const calls: unknown[] = [];
    const client = createBotLLMClient(
      baseConfig,
      mockFetch({
        model: "gpt-test",
        choices: [{ message: { content: "Koy fazla sessiz." } }],
        usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 }
      }, calls)
    );

    const result = await client.chat({
      messages: [{ role: "developer", content: "Kisa konus." }, { role: "user", content: "Ne dusunuyorsun?" }],
      maxOutputTokens: 32,
      temperature: 0.4
    });

    expect(result).toEqual({
      ok: true,
      text: "Koy fazla sessiz.",
      model: "gpt-test",
      usage: { promptTokens: 10, completionTokens: 4, totalTokens: 14 }
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      model: "gpt-test",
      max_completion_tokens: 32,
      temperature: 0.4,
      store: false
    });
  });

  it("posts embeddings and reads the vector", async () => {
    const calls: unknown[] = [];
    const client = createBotLLMClient(
      { ...baseConfig, embeddingDimensions: 384 },
      mockFetch({
        model: "embed-test",
        data: [{ embedding: [0.1, 0.2, 0.3] }],
        usage: { prompt_tokens: 3, total_tokens: 3 }
      }, calls)
    );

    const result = await client.embed("gece oylamasi");

    expect(result).toEqual({
      ok: true,
      embedding: [0.1, 0.2, 0.3],
      model: "embed-test",
      usage: { promptTokens: 3, completionTokens: undefined, totalTokens: 3 }
    });
    expect(calls[0]).toMatchObject({
      model: "embed-test",
      input: "gece oylamasi",
      encoding_format: "float",
      dimensions: 384
    });
  });

  it("omits custom temperature for GPT-5 chat models", async () => {
    const calls: unknown[] = [];
    const client = createBotLLMClient(
      { ...baseConfig, chatModel: "gpt-5-mini" },
      mockFetch({ model: "gpt-5-mini", choices: [{ message: { content: "{}" } }] }, calls)
    );

    await client.chat({ messages: [{ role: "user", content: "JSON" }], temperature: 0.2 });

    expect(calls[0]).not.toHaveProperty("temperature");
    expect(calls[0]).toMatchObject({ reasoning_effort: "minimal" });
  });

  it("maps provider errors without throwing", async () => {
    const client = createBotLLMClient(
      baseConfig,
      async () =>
        new Response(JSON.stringify({ error: { message: "bad request" } }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        })
    );

    const result = await client.chat({ messages: [{ role: "user", content: "Selam" }] });
    expect(result).toEqual({ ok: false, reason: "provider_error", error: "bad request" });
  });
});

function mockFetch(json: unknown, calls: unknown[] = []): typeof fetch {
  return async (_url, init) => {
    calls.push(JSON.parse(String(init?.body ?? "{}")));
    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
}
