import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";

interface ClientLogBody {
  sessionId?: string;
  timestamp?: string;
  event?: string;
  payload?: unknown;
}

function safeLine(body: ClientLogBody): string {
  const ts = typeof body.timestamp === "string" ? body.timestamp : new Date().toISOString();
  const event = typeof body.event === "string" ? body.event : "unknown_event";
  let payload = "";
  try {
    payload = JSON.stringify(body.payload ?? {});
  } catch (_error) {
    payload = "{\"serialize\":\"error\"}";
  }
  return `[${ts}] [${event}] ${payload}\n`;
}

export async function clientLogRoutes(app: FastifyInstance) {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const appRootDir = path.resolve(moduleDir, "..", "..");
  const logsDir = path.resolve(appRootDir, "logs", "client");

  app.post<{ Body: ClientLogBody }>("/client-logs", async (request, reply) => {
    const body = request.body ?? {};
    const sessionIdRaw = typeof body.sessionId === "string" ? body.sessionId : "unknown-session";
    const sessionId = sessionIdRaw.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const filePath = path.join(logsDir, `session_${sessionId}.log`);

    await mkdir(logsDir, { recursive: true });
    await appendFile(filePath, safeLine(body), { encoding: "utf8" });

    return reply.send({ ok: true });
  });
}
