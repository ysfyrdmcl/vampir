import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: storage }));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  const values = new Map<string, string>();
  storage.getItem.mockImplementation(async (key: string) => values.get(key) ?? null);
  storage.setItem.mockImplementation(async (key: string, value: string) => { values.set(key, value); });
});

describe("mobile player notes", () => {
  it("preserves concurrent text edits, tags and other players in submission order", async () => {
    const { savePlayerNote, loadPlayerNotes } = await import("../../mobile/src/storage/player-notes-storage");
    await Promise.all([
      savePlayerNote("ROOM", "a", { tag: "none", note: "İlk" }),
      savePlayerNote("ROOM", "a", { tag: "none", note: "Son not" }),
      savePlayerNote("ROOM", "a", { tag: "suspect", note: "Son not" }),
      savePlayerNote("ROOM", "b", { tag: "trusted", note: "Bilgi" })
    ]);
    expect(await loadPlayerNotes("ROOM")).toEqual({
      a: { tag: "suspect", note: "Son not" },
      b: { tag: "trusted", note: "Bilgi" }
    });
  });

  it("allows the next queued save after a storage write fails", async () => {
    const { savePlayerNote, loadPlayerNotes } = await import("../../mobile/src/storage/player-notes-storage");
    storage.setItem.mockRejectedValueOnce(new Error("disk unavailable"));
    const first = savePlayerNote("ROOM", "a", { tag: "none", note: "İlk" });
    const retry = savePlayerNote("ROOM", "a", { tag: "trusted", note: "Son" });
    await expect(first).rejects.toThrow("disk unavailable");
    await retry;
    expect(await loadPlayerNotes("ROOM")).toEqual({ a: { tag: "trusted", note: "Son" } });
  });
});
