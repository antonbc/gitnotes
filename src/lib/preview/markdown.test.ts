import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders headings", () => {
    const html = renderMarkdown("# Heading One\n\n## Heading Two");
    expect(html).toContain("<h1>");
    expect(html).toContain("Heading One");
    expect(html).toContain("<h2>");
    expect(html).toContain("Heading Two");
  });

  it("renders loose headings typed without a space after the marker", () => {
    const html = renderMarkdown("##check\nwhat");

    expect(html).toContain("<h2>");
    expect(html).toContain("check");
    expect(html).toContain("<p>what</p>");
  });

  it("does not normalize loose headings inside fenced code", () => {
    const html = renderMarkdown("```md\n##not a heading\n```");

    expect(html).toContain("##not a heading");
    expect(html).not.toContain("<h2>");
  });

  it("renders bold and italic", () => {
    const html = renderMarkdown("**bold** and *italic*");
    expect(html).toContain("<strong>");
    expect(html).toContain("bold");
    expect(html).toContain("<em>");
    expect(html).toContain("italic");
  });

  it("renders a GFM table", () => {
    const html = renderMarkdown("| Col A | Col B |\n| --- | --- |\n| 1 | 2 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>");
    expect(html).toContain("Col A");
  });

  it("renders inline code", () => {
    const html = renderMarkdown("Use `console.log()` to debug.");
    expect(html).toContain("<code>");
    expect(html).toContain("console.log()");
  });

  it("renders fenced code blocks", () => {
    const html = renderMarkdown("```js\nconst x = 1;\n```");
    expect(html).toContain("<pre>");
    expect(html).toContain("const x = 1");
  });

  it("renders inline math with KaTeX", () => {
    const html = renderMarkdown("Euler: $e^{i\\pi} + 1 = 0$");
    expect(html).toContain("class=\"katex\"");
  });

  it("renders display math with KaTeX", () => {
    const html = renderMarkdown("$$\n\\int_0^\\infty f(x)\\,dx\n$$");
    expect(html).toContain("class=\"katex-display\"");
  });

  it("does not treat dollar amounts in prose as inline math", () => {
    const html = renderMarkdown("It cost $5 today and $10 tomorrow.");
    expect(html).not.toContain("class=\"katex\"");
    expect(html).toContain("$5 today and $10 tomorrow.");
  });

  it("does not flip code-fence state on a different fence marker inside a block", () => {
    const html = renderMarkdown("```md\n~~~\n##still code\n```\n\n##heading");
    expect(html).toContain("##still code");
    expect(html).toContain("<h2>");
    expect(html).toContain("heading");
  });

  it("renders task list checkboxes", () => {
    const html = renderMarkdown("- [x] Done\n- [ ] Todo");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Done");
    expect(html).toContain("Todo");
  });

  it("linkifies bare URLs", () => {
    const html = renderMarkdown("Visit https://example.com for more.");
    expect(html).toContain('<a href="https://example.com"');
  });
});
