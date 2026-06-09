import { describe, expect, it } from "vitest";
import {
  commands,
  downloadUrl,
  features,
  githubUrl,
  keycaps,
  releasesUrl,
  resolveShortcut,
  stats,
} from "./siteData";

const commandIds = Object.keys(commands);

describe("site data", () => {
  it("points download and repository links at the public GitNotes release", () => {
    expect(githubUrl).toBe("https://github.com/antonbc/gitnotes");
    expect(releasesUrl).toBe(`${githubUrl}/releases`);
    expect(downloadUrl).toBe(
      `${releasesUrl}/latest/download/GitNotes-aarch64.dmg`,
    );
  });

  it("keeps every keyboard keycap wired to an existing preview command", () => {
    expect(keycaps).toHaveLength(commandIds.length);

    for (const keycap of keycaps) {
      expect(commandIds).toContain(keycap.command);
      expect(["⌘", "⇧⌘"]).toContain(keycap.modifier);
      expect(keycap.key).toMatch(/^[A-Z\\]$/);
      expect(keycap.label.length).toBeGreaterThan(0);
    }
  });

  it("resolves the real app shortcuts to commands shown by the keyboard demo", () => {
    const keycapCommands = new Set(keycaps.map((keycap) => keycap.command));
    const cases = [
      [{ metaKey: true, key: "k" }, "palette"],
      [{ metaKey: true, key: "p" }, "search"],
      [{ metaKey: true, key: "s" }, "save"],
      [{ metaKey: true, shiftKey: true, key: "S" }, "sync"],
      [{ metaKey: true, key: "\\" }, "sidebar"],
    ];

    for (const [event, command] of cases) {
      const resolved = resolveShortcut(event);
      expect(resolved).toBe(command);
      expect(keycapCommands.has(resolved)).toBe(true);
    }

    expect(resolveShortcut({ key: "k" })).toBeNull();
    expect(resolveShortcut({ metaKey: true, key: "z" })).toBeNull();
  });

  it("has complete copy for every preview state", () => {
    for (const [id, command] of Object.entries(commands)) {
      expect(id).toMatch(/^[a-z]+$/);
      expect(command).toMatchObject({
        status: expect.any(String),
        mode: expect.any(String),
        vault: expect.any(String),
        search: expect.any(String),
        title: expect.any(String),
        editor: expect.any(String),
        preview: expect.any(String),
      });
    }
  });

  it("keeps the homepage feature and stat strips populated", () => {
    expect(features.length).toBeGreaterThanOrEqual(3);
    expect(stats.map((stat) => stat.value)).toEqual([".md", ".typ", "Git", "FTS5"]);

    for (const feature of features) {
      expect(feature.title).toBeTruthy();
      expect(feature.kicker).toBeTruthy();
      expect(feature.description).toBeTruthy();
      expect(["teal", "blue", "gold"]).toContain(feature.tone);
    }
  });
});
