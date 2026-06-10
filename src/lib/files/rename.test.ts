import { describe, expect, it } from "vitest";
import { resolveRenameInput } from "./rename";

describe("resolveRenameInput", () => {
  it("renames within the same folder when input is a plain name", () => {
    expect(resolveRenameInput("notes/Daily.md", "Journal")).toEqual({
      kind: "target",
      path: "notes/Journal.md",
      ext: "md",
    });
  });

  it("keeps the current extension when none is given", () => {
    expect(resolveRenameInput("Plan.typ", "Roadmap")).toEqual({
      kind: "target",
      path: "Roadmap.typ",
      ext: "typ",
    });
  });

  it("allows switching extension explicitly", () => {
    expect(resolveRenameInput("notes/Daily.md", "Daily.typ")).toEqual({
      kind: "target",
      path: "notes/Daily.typ",
      ext: "typ",
    });
  });

  it("moves into a folder when the input contains a slash", () => {
    expect(resolveRenameInput("Inbox.md", "archive/2026/Inbox")).toEqual({
      kind: "target",
      path: "archive/2026/Inbox.md",
      ext: "md",
    });
  });

  it("moves to the vault root via a leading slash", () => {
    expect(resolveRenameInput("notes/Daily.md", "/Daily.md")).toEqual({
      kind: "target",
      path: "Daily.md",
      ext: "md",
    });
  });

  it("treats slash paths as vault-root relative, not note-folder relative", () => {
    expect(resolveRenameInput("notes/Daily.md", "work/Daily.md")).toEqual({
      kind: "target",
      path: "work/Daily.md",
      ext: "md",
    });
  });

  it("is a noop for empty input or unchanged path", () => {
    expect(resolveRenameInput("a.md", "  ")).toEqual({ kind: "noop" });
    expect(resolveRenameInput("notes/a.md", "a.md")).toEqual({ kind: "noop" });
    expect(resolveRenameInput("notes/a.md", "notes/a.md")).toEqual({ kind: "noop" });
  });

  it("rejects unsupported extensions", () => {
    const result = resolveRenameInput("a.md", "report.pdf");
    expect(result.kind).toBe("invalid");
  });

  it("rejects backslashes and traversal segments", () => {
    expect(resolveRenameInput("a.md", "dir\\b").kind).toBe("invalid");
    expect(resolveRenameInput("a.md", "../b").kind).toBe("invalid");
    expect(resolveRenameInput("a.md", "x/../b").kind).toBe("invalid");
    expect(resolveRenameInput("a.md", "x//b").kind).toBe("invalid");
  });
});
