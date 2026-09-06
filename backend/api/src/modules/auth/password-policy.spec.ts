import { describe, expect, it } from "vitest";
import { validatePasswordPolicy } from "./password-policy";

describe("validatePasswordPolicy", () => {
  it("accepts a strong password", () => {
    expect(validatePasswordPolicy("Tempest!2026")).toEqual([]);
  });

  it("reports missing requirements", () => {
    expect(validatePasswordPolicy("short")).toContain("Use at least 10 characters.");
    expect(validatePasswordPolicy("lowercaseonly")).toContain("Add an uppercase letter.");
    expect(validatePasswordPolicy("NoNumber!!")).toContain("Add a number.");
  });
});
