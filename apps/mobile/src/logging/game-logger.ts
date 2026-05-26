import { runtimeEnv } from "../config/env";
import { isLogScopeMismatch, shouldStoreLogEntryInFeed, type LogScope } from "./log-policy";
import { useLogFeedStore } from "./log-feed-store";

let sessionId: string | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function nowIso(): string {
  return new Date().toISOString();
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return "\"SERIALIZE_ERROR\"";
  }
}

function ensureSession(): void {
  if (sessionId) return;
  sessionId = new Date().toISOString().replace(/[:.]/g, "-");
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log(`[GAMELOG] session_started id=${sessionId}`);
  }
}

export function getActiveLogPath(): string | null {
  return null;
}

function logByScope(scope: LogScope, event: string, payload?: Record<string, unknown>): void {
  ensureSession();
  const ts = nowIso();
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    const linePayload = payload ? safeJson(payload) : "";
    console.log(`[GAMELOG] ${event} ${linePayload}`);
  }
  if (isLogScopeMismatch(scope, event)) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn(`[GAMELOG] scope_mismatch scope=${scope} event=${event}`);
    }
  }
  if (shouldStoreLogEntryInFeed(scope, event)) {
    useLogFeedStore.getState().push({
      ts,
      event,
      payload,
      scope
    });
  }

  if (runtimeEnv.clientLogUrl) {
    writeQueue = writeQueue
      .then(async () => {
        await fetch(runtimeEnv.clientLogUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            sessionId,
            timestamp: ts,
            event,
            payload: payload ?? {},
            scope
          })
        });
      })
      .catch((error) => {
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.warn("[GAMELOG] remote_logger_error", error);
        }
      });
  }
}

export function logGameEvent(event: string, payload?: Record<string, unknown>): void {
  logByScope("general", event, payload);
}

export function logPersonalEvent(event: string, payload?: Record<string, unknown>): void {
  logByScope("personal", event, payload);
}
