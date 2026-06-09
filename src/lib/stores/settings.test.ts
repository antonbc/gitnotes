import { describe, expect, it } from "vitest";
import { migrateLegacyPrefs } from "./settings.svelte";

describe("migrateLegacyPrefs", () => {
  it("maps retired theme names to the new palette", () => {
    expect(migrateLegacyPrefs({ theme: "warm", editorFont: "mono" }).theme).toBe("light");
    expect(migrateLegacyPrefs({ theme: "forest", editorFont: "mono" }).theme).toBe("dark");
    expect(migrateLegacyPrefs({ theme: "midnight", editorFont: "mono" }).theme).toBe("oled");
  });

  it("keeps supported themes and editor fonts", () => {
    const migrated = migrateLegacyPrefs({ theme: "dark", editorFont: "serif" });
    expect(migrated.theme).toBe("dark");
    expect(migrated.font).toBe("serif");
  });
});
