import { describe, expect, it } from "vitest";
import { formatSpec } from "./formatting";

describe("formatSpec — Markdown (.md)", () => {
  it("bold: **text**", () => {
    const s = formatSpec("bold", "md");
    expect(s.prefix).toBe("**");
    expect(s.suffix).toBe("**");
  });

  it("italic: *text*", () => {
    const s = formatSpec("italic", "md");
    expect(s.prefix).toBe("*");
    expect(s.suffix).toBe("*");
  });

  it("heading1: # line-prefix", () => {
    const s = formatSpec("heading1", "md");
    expect(s.linePrefix).toBe("# ");
  });

  it("heading2: ## line-prefix", () => {
    const s = formatSpec("heading2", "md");
    expect(s.linePrefix).toBe("## ");
  });

  it("bullet: - line-prefix", () => {
    expect(formatSpec("bullet", "md").linePrefix).toBe("- ");
  });

  it("numbered: 1. line-prefix", () => {
    expect(formatSpec("numbered", "md").linePrefix).toBe("1. ");
  });

  it("task: - [ ] line-prefix", () => {
    expect(formatSpec("task", "md").linePrefix).toBe("- [ ] ");
  });

  it("link: [text](url) block", () => {
    const s = formatSpec("link", "md");
    expect(s.block).toContain("[");
    expect(s.block).toContain("](");
  });

  it("image: ![alt](path) block", () => {
    const s = formatSpec("image", "md");
    expect(s.block).toContain("![");
  });

  it("inlineCode: `text`", () => {
    const s = formatSpec("inlineCode", "md");
    expect(s.prefix).toBe("`");
    expect(s.suffix).toBe("`");
  });

  it("codeBlock: fenced block", () => {
    const s = formatSpec("codeBlock", "md");
    expect(s.block).toContain("```");
  });

  it("quote: > line-prefix", () => {
    expect(formatSpec("quote", "md").linePrefix).toBe("> ");
  });

  it("table: GFM table skeleton", () => {
    const s = formatSpec("table", "md");
    expect(s.block).toContain("---");
  });
});

describe("formatSpec — Typst (.typ)", () => {
  it("bold: *text* (single star)", () => {
    const s = formatSpec("bold", "typ");
    expect(s.prefix).toBe("*");
    expect(s.suffix).toBe("*");
  });

  it("italic: _text_", () => {
    const s = formatSpec("italic", "typ");
    expect(s.prefix).toBe("_");
    expect(s.suffix).toBe("_");
  });

  it("heading1: = line-prefix", () => {
    expect(formatSpec("heading1", "typ").linePrefix).toBe("= ");
  });

  it("heading2: == line-prefix", () => {
    expect(formatSpec("heading2", "typ").linePrefix).toBe("== ");
  });

  it("bullet: - line-prefix", () => {
    expect(formatSpec("bullet", "typ").linePrefix).toBe("- ");
  });

  it("numbered: + line-prefix", () => {
    expect(formatSpec("numbered", "typ").linePrefix).toBe("+ ");
  });

  it("task: - [ ] line-prefix", () => {
    expect(formatSpec("task", "typ").linePrefix).toBe("- [ ] ");
  });

  it("link: #link(url)[text] block", () => {
    const s = formatSpec("link", "typ");
    expect(s.block).toContain("#link(");
  });

  it("image: #image(path) block", () => {
    const s = formatSpec("image", "typ");
    expect(s.block).toContain("#image(");
  });

  it("inlineCode: `text`", () => {
    const s = formatSpec("inlineCode", "typ");
    expect(s.prefix).toBe("`");
    expect(s.suffix).toBe("`");
  });

  it("codeBlock: fenced block", () => {
    expect(formatSpec("codeBlock", "typ").block).toContain("```");
  });

  it("quote: #quote[ ] block", () => {
    expect(formatSpec("quote", "typ").block).toContain("#quote");
  });

  it("table: #table(columns:…) block", () => {
    expect(formatSpec("table", "typ").block).toContain("#table");
  });
});

describe("formatSpec — md vs typ differ where spec requires", () => {
  it("bold uses ** for md but * for typ", () => {
    expect(formatSpec("bold", "md").prefix).toBe("**");
    expect(formatSpec("bold", "typ").prefix).toBe("*");
  });

  it("italic uses * for md but _ for typ", () => {
    expect(formatSpec("italic", "md").prefix).toBe("*");
    expect(formatSpec("italic", "typ").prefix).toBe("_");
  });

  it("heading1 uses # for md but = for typ", () => {
    expect(formatSpec("heading1", "md").linePrefix).toBe("# ");
    expect(formatSpec("heading1", "typ").linePrefix).toBe("= ");
  });

  it("numbered uses 1. for md but + for typ", () => {
    expect(formatSpec("numbered", "md").linePrefix).toBe("1. ");
    expect(formatSpec("numbered", "typ").linePrefix).toBe("+ ");
  });
});
