import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "./button";

describe("Button", () => {
  it("defaults to a non-submit button and supports an accessible label", () => {
    const html = renderToStaticMarkup(
      <Button aria-label="Continue" className="custom" />,
    );
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Continue"');
    expect(html).toContain("custom");
  });
});
