import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadDotEnv();

const booleanEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default("*"),
  SOCKET_PATH: z.string().default("/socket.io"),
  CLIENT_LOGS_ENABLED: booleanEnv.default(false),
  SOCKET_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(10_000),
  SOCKET_RATE_LIMIT_MAX_EVENTS: z.coerce.number().int().positive().default(80),
  SOCKET_IP_MAX_EVENTS: z.coerce.number().int().positive().default(800),
  SOCKET_MAX_CONNECTIONS: z.coerce.number().int().positive().default(1000),
  SOCKET_MAX_CONNECTIONS_PER_IP: z.coerce.number().int().positive().default(100),
  ROOM_MAX_COUNT: z.coerce.number().int().positive().default(200),
  ROOM_CODE_LENGTH: z.coerce.number().default(6),
  ROOM_MIN_PLAYERS: z.coerce.number().default(4),
  ROOM_MAX_PLAYERS: z.coerce.number().default(100),
  ROOM_IDLE_TTL_SECONDS: z.coerce.number().default(1800),
  ROOM_AFTER_GAME_TTL_SECONDS: z.coerce.number().default(300),
  ROLE_REVEAL_SECONDS: z.coerce.number().default(10),
  NIGHT_INTRO_SECONDS: z.coerce.number().default(5),
  VAMPIRE_ACTION_SECONDS: z.coerce.number().default(30),
  DETECTIVE_ACTION_SECONDS: z.coerce.number().default(20),
  DOCTOR_ACTION_SECONDS: z.coerce.number().default(20),
  DAY_DISCUSSION_SECONDS: z.coerce.number().default(120),
  DAY_VOTE_SECONDS: z.coerce.number().default(45),
  RESULT_SCREEN_SECONDS: z.coerce.number().default(10),
  BOT_AI_ENABLED: booleanEnv.default(false),
  BOT_LLM_ENABLED: booleanEnv.default(false),
  BOT_LLM_PROVIDER: z.enum(["openai"]).default("openai"),
  BOT_LLM_MODEL: z.string().default("gpt-4o-mini"),
  BOT_LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
  BOT_LLM_MAX_CALLS_PER_PHASE: z.coerce.number().int().min(0).default(3),
  BOT_LLM_TARGET_RANKING_ENABLED: booleanEnv.default(false),
  BOT_INTERACTION_MAX_CHAIN_LENGTH: z.coerce.number().int().min(0).max(3).default(2),
  BOT_EMBEDDING_ENABLED: booleanEnv.default(false),
  BOT_EMBEDDING_MODEL: z.string().default("text-embedding-ada-002"),
  BOT_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().optional(),
  OPENAI_API_KEY: z.string().optional()
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === "production" && value.CORS_ORIGIN.trim() === "*") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CORS_ORIGIN"],
      message: "CORS_ORIGIN must be restricted in production"
    });
  }
});

export const env = envSchema.parse(process.env);

function loadDotEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(here, "../../.env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return [key, value];
}
