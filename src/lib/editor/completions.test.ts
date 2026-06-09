import { CompletionContext } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { noteCompletionSource } from "./completions";
import type { Ext } from "$lib/types";

function complete(doc: string, ext: Ext, explicit = false) {
  const source = noteCompletionSource(ext);
  const state = EditorState.create({ doc });
  return source(new CompletionContext(state, doc.length, explicit));
}

describe("noteCompletionSource", () => {
  it("offers Markdown heading completions after # at the start of a line", () => {
    const result = complete("#", "md");

    expect(result?.from).toBe(0);
    expect(result?.options.map((option) => option.label)).toEqual([
      "# Heading 1",
      "## Heading 2",
      "### Heading 3",
      "#### Heading 4",
      "##### Heading 5",
    ]);
    expect(result?.options[1].apply).toBe("## ");
  });

  it("preserves indentation when completing a Markdown heading marker", () => {
    const result = complete("  ##", "md");

    expect(result?.from).toBe(2);
    expect(result?.options[0].apply).toBe("# ");
  });

  it("does not trigger Markdown headings for mid-line hashtags", () => {
    expect(complete("note #", "md")).toBeNull();
  });

  it("offers Typst heading completions after = at the start of a line", () => {
    const result = complete("=", "typ");

    expect(result?.from).toBe(0);
    expect(result?.options.map((option) => option.apply)).toEqual([
      "= ",
      "== ",
      "=== ",
      "==== ",
      "===== ",
    ]);
  });

  it("offers a Markdown slash menu with headings and block inserts", () => {
    const result = complete("/", "md");

    expect(result?.from).toBe(0);
    expect(result?.to).toBe(1);
    expect(result?.options.map((option) => option.label)).toContain("Heading 5");
    expect(result?.options.map((option) => option.label)).toContain("Table");
    expect(result?.options.map((option) => option.label)).toContain("Math block");
  });

  it("filters slash menu options by typed query", () => {
    const result = complete("/ta", "md");
    const labels = result?.options.map((option) => option.label);

    expect(labels).toContain("Table");
    expect(labels).toContain("Task list");
    expect(labels).not.toContain("Heading 1");
  });

  it("uses Typst syntax in the slash menu", () => {
    const result = complete("/link", "typ");
    const link = result?.options.find((option) => option.label === "Link");

    expect(link?.apply).toBe('#link("url")[text]');
  });

  it("does not show implicit completions unless the trigger was just typed", () => {
    expect(complete("", "md")).toBeNull();
    expect(complete("#", "md", true)?.options).toHaveLength(5);
  });
});
