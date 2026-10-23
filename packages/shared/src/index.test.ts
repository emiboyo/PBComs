import { describe, expect, it } from "vitest";
import { assertNever, cn } from "./index";

describe("shared utilities", () => {
  it("joins only present class names", () => {
    expect(cn("base", false, undefined, "active")).toBe("base active");
  });

  it("throws for an unexpected runtime value", () => {
    expect(() => assertNever("invalid" as never)).toThrow(
      "Unexpected value: invalid",
    );
  });
});
