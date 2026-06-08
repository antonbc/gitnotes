<script lang="ts">
  import {
    settings, saveSettings,
    THEMES, THEME_LABELS, THEME_SWATCHES,
    EDITOR_FONTS, EDITOR_FONT_LABELS,
  } from '$lib/stores/settings.svelte';

  let { onClose }: { onClose: () => void } = $props();

  function setTheme(t: typeof THEMES[number]) {
    settings.theme = t;
    saveSettings();
  }

  function setFont(f: typeof EDITOR_FONTS[number]) {
    settings.editorFont = f;
    saveSettings();
  }

  function setSize(e: Event) {
    settings.fontSize = Number((e.target as HTMLInputElement).value);
    saveSettings();
  }
</script>

<div
  class="scrim"
  role="button"
  tabindex="0"
  onclick={onClose}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <div
    class="panel"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Settings"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <header class="panel-header">
      <h2>Settings</h2>
      <button class="close-btn" onclick={onClose} aria-label="Close settings">✕</button>
    </header>

    <section class="section">
      <div class="section-label">Theme</div>
      <div class="theme-grid">
        {#each THEMES as t}
          {@const sw = THEME_SWATCHES[t]}
          <button
            class="swatch"
            class:active={settings.theme === t}
            onclick={() => setTheme(t)}
            title={THEME_LABELS[t]}
            style="--sw-bg:{sw.bg}; --sw-accent:{sw.accent}; --sw-text:{sw.text}"
          >
            <span class="swatch-preview">
              <span class="swatch-bar" style="background:{sw.accent}"></span>
            </span>
            <span class="swatch-name">{THEME_LABELS[t]}</span>
          </button>
        {/each}
      </div>
    </section>

    <section class="section">
      <div class="section-label">Editor Font</div>
      <div class="font-options">
        {#each EDITOR_FONTS as f}
          <button
            class="font-btn"
            class:active={settings.editorFont === f}
            onclick={() => setFont(f)}
          >
            {EDITOR_FONT_LABELS[f]}
          </button>
        {/each}
      </div>
    </section>

    <section class="section">
      <div class="section-label">
        Font Size
        <span class="size-value">{settings.fontSize}px</span>
      </div>
      <div class="slider-row">
        <span class="size-min">11</span>
        <input
          type="range"
          min="11"
          max="22"
          step="1"
          value={settings.fontSize}
          oninput={setSize}
          class="slider"
        />
        <span class="size-max">22</span>
      </div>
    </section>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(2px);
  }

  .panel {
    width: min(420px, calc(100vw - 32px));
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    color: var(--text);
    font-family: var(--font-ui);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--border-subtle);
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }

  .close-btn {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    cursor: pointer;
  }

  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .section {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .section:last-child {
    border-bottom: none;
  }

  .section-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .size-value {
    font-size: 12px;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }

  /* ── Theme swatches ── */
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }

  .swatch {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px 4px;
    border-radius: 8px;
    border: 2px solid transparent;
    background: var(--sw-bg);
    cursor: pointer;
    transition: border-color 0.12s, transform 0.1s;
  }

  .swatch:hover {
    transform: translateY(-1px);
    border-color: var(--sw-accent);
  }

  .swatch.active {
    border-color: var(--sw-accent);
    box-shadow: 0 0 0 1px var(--sw-accent);
  }

  .swatch-preview {
    width: 32px;
    height: 22px;
    border-radius: 5px;
    background: var(--sw-bg);
    border: 1px solid rgba(0,0,0,0.1);
    overflow: hidden;
    position: relative;
    display: block;
  }

  .swatch-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 5px;
    display: block;
  }

  .swatch-name {
    font-size: 10px;
    font-weight: 500;
    color: var(--sw-text);
    white-space: nowrap;
  }

  /* ── Editor Font ── */
  .font-options {
    display: flex;
    gap: 8px;
  }

  .font-btn {
    flex: 1;
    height: 36px;
    border-radius: 8px;
    border: 1.5px solid var(--border);
    background: var(--bg-input);
    color: var(--text-muted);
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s, background 0.12s;
  }

  .font-btn:hover {
    border-color: var(--accent);
    color: var(--text);
  }

  .font-btn.active {
    border-color: var(--accent);
    background: var(--accent-subtle);
    color: var(--accent);
    font-weight: 600;
  }

  /* ── Font Size ── */
  .slider-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .size-min,
  .size-max {
    font-size: 11px;
    color: var(--text-faint);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  .slider {
    flex: 1;
    height: 4px;
    appearance: none;
    background: var(--border);
    border-radius: 4px;
    outline: none;
    cursor: pointer;
  }

  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }

  .slider::-webkit-slider-thumb:hover {
    background: var(--accent-hover);
  }
</style>
