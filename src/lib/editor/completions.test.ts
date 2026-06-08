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
    expect(result?.options.map((option) => option.apply)).toEqual(["= ", "== ", "=== "]);
  });

  it("does not show implicit completions unless the trigger was just typed", () => {
    expect(complete("", "md")).toBeNull();
    expect(complete("#", "md", true)?.options).toHaveLength(3);
  });
});
