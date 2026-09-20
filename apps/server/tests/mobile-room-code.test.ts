import { describe, expect, it } from "vitest";
import { roomCodeFromClipboard } from "../../mobile/src/utils/room-code";

describe("pasted room invitations", () => {
  it("extracts the code from an invitation instead of the game name", () => {
    expect(roomCodeFromClipboard("Vampir Köylü oynayalım! Oda kodu: abc234")).toBe("ABC234");
    expect(roomCodeFromClipboard(" abc234 \n")).toBe("ABC234");
  });

  it("does not turn prose or a longer identifier into a room code", () => {
    expect(roomCodeFromClipboard("Vampir Köylü oynayalım!")).toBeNull();
    expect(roomCodeFromClipboard("Oda kodu: ABC2345")).toBeNull();
  });
});
