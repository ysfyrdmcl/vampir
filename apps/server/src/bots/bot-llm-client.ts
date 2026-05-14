import { env } from "../config/env.js";

export type BotLLMMessage = {
  role: "developer" | "system" | "user" | "assistant";
  content: string;
};

export type BotLLMChatRequest = {
  messages: BotLLMMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  responseFormat?: "json_object";
};

export type BotLLMChatResult =
  | { ok: true; text: string; model: string; usage?: BotLLMUsage }
  | { ok: false; reason: "disabled" | "configuration_error" | "timeout" | "provider_error"; error?: string };

export type BotEmbeddingResult =
  | { ok: true; embedding: number[]; model: string; usage?: BotLLMUsage }
  | { ok: false; reason: "disabled" | "configuration_error" | "timeout" | "provider_error"; error?: string };

export type BotLLMUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

type FetchLike = typeof fetch;

export type BotLLMClientConfig = {
  llmEnabled: boolean;
  embeddingEnabled: boolean;
  provider: "openai";
  apiKey?: string;
  chatModel: string;
  embeddingModel: string;
  embeddingDimensions?: number;
  timeoutMs: number;
};

export interface BotLLMClient {
  chat(request: BotLLMChatRequest): Promise<BotLLMChatResult>;
  embed(input: string): Promise<BotEmbeddingResult>;
}

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

export function botLLMConfigFromEnv(): BotLLMClientConfig {
  return {
    llmEnabled: env.BOT_AI_ENABLED && env.BOT_LLM_ENABLED,
    embeddingEnabled: env.BOT_AI_ENABLED && env.BOT_EMBEDDING_ENABLED,
    provider: env.BOT_LLM_PROVIDER,
    apiKey: env.OPENAI_API_KEY,
    chatModel: env.BOT_LLM_MODEL,
    embeddingModel: env.BOT_EMBEDDING_MODEL,
    embeddingDimensions: env.BOT_EMBEDDING_DIMENSIONS,
    timeoutMs: env.BOT_LLM_TIMEOUT_MS
  };
}

export function createBotLLMClient(config: BotLLMClientConfig = botLLMConfigFromEnv(), fetcher: FetchLike = fetch): BotLLMClient {
  return new OpenAIBotLLMClient(config, fetcher);
}

class OpenAIBotLLMClient implements BotLLMClient {
  constructor(
    private readonly config: BotLLMClientConfig,
    private readonly fetcher: FetchLike
  ) {}

  async chat(request: BotLLMChatRequest): Promise<BotLLMChatResult> {
    if (!this.config.llmEnabled) return { ok: false, reason: "disabled" };
    if (!this.config.apiKey) return { ok: false, reason: "configuration_error", error: "OPENAI_API_KEY is required" };

    const body: Record<string, unknown> = {
      model: this.config.chatModel,
      messages: request.messages,
      max_completion_tokens: request.maxOutputTokens ?? defaultMaxCompletionTokens(this.config.chatModel),
      store: false
    };
    if (supportsCustomTemperature(this.config.chatModel)) {
      body.temperature = request.temperature ?? 0.7;
    }
    if (supportsReasoningEffort(this.config.chatModel)) {
      body.reasoning_effort = "minimal";
    }
    if (request.responseFormat) {
      body.response_format = { type: request.responseFormat };
    }

    const result = await this.postJson(OPENAI_CHAT_COMPLETIONS_URL, body);
    if (!result.ok) return result;

    const text = readChatText(result.json);
    if (!text) {
      return { ok: false, reason: "provider_error", error: "OpenAI response did not include message content" };
    }

    return {
      ok: true,
      text,
      model: readString(result.json, "model") ?? this.config.chatModel,
      usage: readUsage(result.json)
    };
  }

  async embed(input: string): Promise<BotEmbeddingResult> {
    if (!this.config.embeddingEnabled) return { ok: false, reason: "disabled" };
    if (!this.config.apiKey) return { ok: false, reason: "configuration_error", error: "OPENAI_API_KEY is required" };

    const trimmed = input.trim();
    if (!trimmed) return { ok: false, reason: "configuration_error", error: "Embedding input is empty" };

    const body: Record<string, unknown> = {
      model: this.config.embeddingModel,
      input: trimmed,
      encoding_format: "float"
    };
    if (this.config.embeddingDimensions) {
      body.dimensions = this.config.embeddingDimensions;
    }

    const result = await this.postJson(OPENAI_EMBEDDINGS_URL, body);
    if (!result.ok) return result;

    const embedding = readEmbedding(result.json);
    if (!embedding) {
      return { ok: false, reason: "provider_error", error: "OpenAI response did not include embedding" };
    }

    return {
      ok: true,
      embedding,
      model: readString(result.json, "model") ?? this.config.embeddingModel,
      usage: readUsage(result.json)
    };
  }

  private async postJson(
    url: string,
    body: Record<string, unknown>
  ): Promise<{ ok: true; json: unknown } | { ok: false; reason: "timeout" | "provider_error"; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.fetcher(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        return { ok: false, reason: "provider_error", error: readProviderError(json) ?? `HTTP ${response.status}` };
      }
      return { ok: true, json };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, reason: "timeout", error: "LLM request timed out" };
      }
      return { ok: false, reason: "provider_error", error: error instanceof Error ? error.message : "Unknown provider error" };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function readChatText(json: unknown): string | null {
  if (!isRecord(json)) return null;
  const choices = json.choices;
  if (!Array.isArray(choices)) return null;
  const first = choices[0];
  if (!isRecord(first) || !isRecord(first.message)) return null;
  return typeof first.message.content === "string" ? first.message.content.trim() : null;
}

function readEmbedding(json: unknown): number[] | null {
  if (!isRecord(json) || !Array.isArray(json.data)) return null;
  const first = json.data[0];
  if (!isRecord(first) || !Array.isArray(first.embedding)) return null;
  return first.embedding.every((x) => typeof x === "number") ? first.embedding : null;
}

function readUsage(json: unknown): BotLLMUsage | undefined {
  if (!isRecord(json) || !isRecord(json.usage)) return undefined;
  return {
    promptTokens: readNumber(json.usage, "prompt_tokens"),
    completionTokens: readNumber(json.usage, "completion_tokens"),
    totalTokens: readNumber(json.usage, "total_tokens")
  };
}

function readProviderError(json: unknown): string | null {
  if (!isRecord(json) || !isRecord(json.error)) return null;
  return typeof json.error.message === "string" ? json.error.message : null;
}

function readString(record: unknown, key: string): string | null {
  if (!isRecord(record)) return null;
  return typeof record[key] === "string" ? record[key] : null;
}

function readNumber(record: unknown, key: string): number | undefined {
  if (!isRecord(record)) return undefined;
  return typeof record[key] === "number" ? record[key] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function supportsCustomTemperature(model: string): boolean {
  return !model.startsWith("gpt-5");
}

function supportsReasoningEffort(model: string): boolean {
  return model.startsWith("gpt-5");
}

function defaultMaxCompletionTokens(model: string): number {
  return model.startsWith("gpt-5") ? 240 : 120;
}
