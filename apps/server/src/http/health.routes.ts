import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      ok: true,
      service: "vampir-koylu-server",
      now: new Date().toISOString()
    };
  });
}

