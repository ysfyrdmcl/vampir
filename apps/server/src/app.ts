import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./http/health.routes.js";
import { clientLogRoutes } from "./http/client-logs.routes.js";
import { env } from "./config/env.js";

export async function createApp() {
  const app = Fastify({
    logger: true,
    bodyLimit: 64 * 1024
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN
  });

  await app.register(healthRoutes);
  if (env.NODE_ENV !== "production" || env.CLIENT_LOGS_ENABLED) {
    await app.register(clientLogRoutes);
  }

  return app;
}
