import { describe, expect, it } from "vitest";
import { parseSnippet } from "./snippet";

describe("parseSnippet", () => {
  it("returns a single plain segment when no marks exist", () => {
    expect(parseSnippet("just some text")).toEqual([
      { text: "just some text", mark: false },
    ]);
  });

  it("splits marked terms into highlighted segments", () => {
    expect(parseSnippet("...meeting <mark>notes</mark> for Monday")).toEqual([
      { text: "...meeting ", mark: false },
      { text: "notes", mark: true },
      { text: " for Monday", mark: false },
    ]);
  });

  it("handles multiple marks and adjacent marks", () => {
    expect(parseSnippet("<mark>git</mark> <mark>sync</mark>")).toEqual([
      { text: "git", mark: true },
      { text: " ", mark: false },
      { text: "sync", mark: true },
    ]);
  });

  it("treats literal angle brackets in note content as plain text", () => {
    expect(parseSnippet("a < b and <em>not html</em>")).toEqual([
      { text: "a < b and <em>not html</em>", mark: false },
    ]);
  });

  it("handles marks spanning newlines", () => {
    expect(parseSnippet("x <mark>two\nlines</mark> y")).toEqual([
      { text: "x ", mark: false },
      { text: "two\nlines", mark: true },
      { text: " y", mark: false },
    ]);
  });

  it("returns no segments for an empty snippet", () => {
    expect(parseSnippet("")).toEqual([]);
  });
});
