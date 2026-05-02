import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./http/health.routes.js";
import { clientLogRoutes } from "./http/client-logs.routes.js";
import { env } from "./config/env.js";

export async function createApp() {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN
  });

  await app.register(healthRoutes);
  await app.register(clientLogRoutes);

  return app;
}
