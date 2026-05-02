import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default("*"),
  SOCKET_PATH: z.string().default("/socket.io"),
  ROOM_CODE_LENGTH: z.coerce.number().default(6),
  ROOM_MIN_PLAYERS: z.coerce.number().default(4),
  ROOM_MAX_PLAYERS: z.coerce.number().default(20),
  ROOM_IDLE_TTL_SECONDS: z.coerce.number().default(1800),
  ROOM_AFTER_GAME_TTL_SECONDS: z.coerce.number().default(300),
  ROLE_REVEAL_SECONDS: z.coerce.number().default(10),
  NIGHT_INTRO_SECONDS: z.coerce.number().default(5),
  VAMPIRE_ACTION_SECONDS: z.coerce.number().default(30),
  DETECTIVE_ACTION_SECONDS: z.coerce.number().default(20),
  DOCTOR_ACTION_SECONDS: z.coerce.number().default(20),
  DAY_DISCUSSION_SECONDS: z.coerce.number().default(120),
  DAY_VOTE_SECONDS: z.coerce.number().default(45),
  RESULT_SCREEN_SECONDS: z.coerce.number().default(10)
});

export const env = envSchema.parse(process.env);
