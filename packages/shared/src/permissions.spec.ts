import { describe, expect, it } from "vitest";
import { hasPermission } from "./index";

describe("hasPermission", () => {
  it("allows explicit permissions", () => {
    expect(hasPermission(["SEND_FILES"], "SEND_FILES")).toBe(true);
  });

  it("allows administrators to perform every action", () => {
    expect(hasPermission(["ADMINISTRATOR"], "BAN_MEMBERS")).toBe(true);
  });

  it("denies missing permissions", () => {
    expect(hasPermission(["SPEAK"], "BAN_MEMBERS")).toBe(false);
  });
});
