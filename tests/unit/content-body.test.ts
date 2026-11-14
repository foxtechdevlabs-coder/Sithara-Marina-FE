import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ContentBody } from "@/features/user/content/components/content-body";

const render = (body: string) => renderToStaticMarkup(createElement(ContentBody, { body }));

describe("ContentBody", () => {
  it("never renders the backend's text as HTML", () => {
    const html = render('<script>alert(1)</script>\n\n<img src=x onerror="alert(2)">');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("splits paragraphs on blank lines and keeps single line breaks as text", () => {
    const html = render("First line\nsame paragraph\n\n\nSecond paragraph\r\n\r\nThird");
    expect(html.match(/<p /g)).toHaveLength(3);
    expect(html).toContain("First line\nsame paragraph");
  });
});
