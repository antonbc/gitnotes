<script>
  import AppIcon from "./AppIcon.svelte";
  import { THEMES, FONTS } from "../../lib/gitnotesData.js";

  let { theme, setTheme, font, setFont, onClose } = $props();

  const SW = {
    light: { top: "#ececee", bar: "#e9e9ec", bg: "#ffffff", line: "#1d1d1f", line2: "#c9c9cf", acc: "#0a6cff" },
    dark: { top: "#2c2c2e", bar: "#232325", bg: "#1c1c1e", line: "#f1f1f3", line2: "#46464a", acc: "#0a84ff" },
    oled: { top: "#0a0a0b", bar: "#050506", bg: "#000000", line: "#fafafa", line2: "#333", acc: "#0a84ff" },
  };

  function onKey(e) { if (e.key === "Escape") onClose(); }
  const fontFamily = (id) => (id === "mono" ? "var(--font-mono)" : id === "serif" ? "var(--font-prose-serif)" : "var(--font-prose-sans)");
</script>

<svelte:window onkeydown={onKey} />

<div style="position:absolute;inset:0;z-index:55" onmousedown={onClose} role="presentation"></div>
<div class="appearance" onmousedown={(e) => e.stopPropagation()} role="presentation">
  <div class="ap-title">Theme</div>
  <div class="theme-row">
    {#each THEMES as t}
      <button class={"theme-card" + (theme === t.id ? " on" : "")} onclick={() => setTheme(t.id)}>
        <div class="theme-swatch" style={`background:${SW[t.id].bg}`}>
          <div class="sw-top" style={`background:${SW[t.id].top}`}></div>
          <div class="sw-body">
            <div class="sw-bar" style={`background:${SW[t.id].bar}`}></div>
            <div class="sw-lines">
              <div class="sw-line" style={`background:${SW[t.id].acc};width:55%`}></div>
              <div class="sw-line" style={`background:${SW[t.id].line};width:85%`}></div>
              <div class="sw-line" style={`background:${SW[t.id].line2};width:70%`}></div>
            </div>
          </div>
        </div>
        <div class="theme-name">{t.name}</div>
      </button>
    {/each}
  </div>
  <div class="ap-title mt">Editor font</div>
  <div class="font-row">
    {#each FONTS as f}
      <button class={"font-opt" + (font === f.id ? " on" : "")} onclick={() => setFont(f.id)}>
        <span class="fa" style={`font-family:${fontFamily(f.id)}`}>{f.glyph}a</span>
        <span class="fmeta"><div class="fn">{f.name}</div><div class="fd">{f.desc}</div></span>
        <span class="check"><AppIcon name="check" size={16} /></span>
      </button>
    {/each}
  </div>
</div>
