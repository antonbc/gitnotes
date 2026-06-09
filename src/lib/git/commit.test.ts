import { describe, expect, it } from "vitest";
import { canCommitPush } from "./commit";

const status = {
  branch: "main",
  ahead: 0,
  behind: 0,
  dirty: false,
  conflicted: [],
};

describe("canCommitPush", () => {
  it("requires a git status", () => {
    expect(canCommitPush({ status: null, conflicts: [], dirtyTabCount: 1, localChangeCount: 0 })).toBe(false);
  });

  it("blocks while merge conflicts are open", () => {
    expect(
      canCommitPush({
        status: { ...status, dirty: true },
        conflicts: ["note.md"],
        dirtyTabCount: 0,
        localChangeCount: 1,
      }),
    ).toBe(false);
  });

  it("allows push when git reports a dirty tree after restart", () => {
    expect(
      canCommitPush({
        status: { ...status, dirty: true },
        conflicts: [],
        dirtyTabCount: 0,
        localChangeCount: 0,
      }),
    ).toBe(true);
  });

  it("allows push for unpushed commits with a clean tree", () => {
    expect(
      canCommitPush({
        status: { ...status, ahead: 2 },
        conflicts: [],
        dirtyTabCount: 0,
        localChangeCount: 0,
      }),
    ).toBe(true);
  });
});
