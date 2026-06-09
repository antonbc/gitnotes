<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip';
  import {
    settings, saveSettings,
    THEMES, THEME_LABELS, THEME_SWATCHES,
    EDITOR_FONTS, EDITOR_FONT_LABELS, EDITOR_FONT_DESCS, EDITOR_FONT_STACKS,
  } from '$lib/stores/settings.svelte';

  let { onClose }: { onClose: () => void } = $props();
</script>

<!-- click-away scrim -->
<div
  class="fixed inset-0 z-[55]"
  role="button"
  tabindex="0"
  aria-label="Close appearance"
  onclick={onClose}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
></div>

<div
  class="absolute top-[50px] right-3 w-80 z-[60] bg-bg-elevated rounded-lg border-[0.5px] border-[var(--line-strong)] shadow-[var(--shadow-lg)] p-3.5 animate-[pop_0.12s_ease]"
  role="dialog" aria-label="Appearance settings" tabindex="-1"
  onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <!-- Theme -->
  <div class="text-[11px] font-bold text-text-faint tracking-[0.03em] mx-0.5 mt-1 mb-2">Theme</div>
  <div class="grid grid-cols-3 gap-[9px]">
    {#each THEMES as t}
      {@const c = THEME_SWATCHES[t]}
      {@const on = settings.theme === t}
      <button
        class="border-[1.5px] rounded-lg overflow-hidden bg-bg-elevated p-0 transition-[border-color,background-color,transform] duration-100 hover:bg-bg-hover active:scale-[0.97] {on
          ? 'border-accent shadow-[0_0_0_2px_var(--accent-soft)]'
          : 'border-border'}"
        aria-label={`Use ${THEME_LABELS[t]} theme`}
        aria-pressed={on}
        use:tooltip={{ label: `Use ${THEME_LABELS[t]} theme`, placement: "bottom" }}
        onclick={() => { settings.theme = t; saveSettings(); }}
      >
        <div class="h-[50px] flex flex-col" style="background:{c.bg}">
          <div class="h-4" style="background:{c.top}"></div>
          <div class="flex-1 flex">
            <div class="w-[30%]" style="background:{c.bar}"></div>
            <div class="flex-1 px-1.5 py-[5px] flex flex-col gap-[3px]">
              <div class="h-[3px] rounded-[2px]" style="background:{c.acc}; width:55%"></div>
              <div class="h-[3px] rounded-[2px]" style="background:{c.line}; width:85%"></div>
              <div class="h-[3px] rounded-[2px]" style="background:{c.line2}; width:70%"></div>
            </div>
          </div>
        </div>
        <div class="text-[11.5px] font-semibold text-center py-[5px] {on ? 'text-accent' : 'text-text'}">{THEME_LABELS[t]}</div>
      </button>
    {/each}
  </div>

  <!-- Editor font -->
  <div class="text-[11px] font-bold text-text-faint tracking-[0.03em] mx-0.5 mt-4 mb-2">Editor font</div>
  <div class="flex flex-col gap-1.5">
    {#each EDITOR_FONTS as f}
      {@const on = settings.editorFont === f}
      <button
        class="flex items-center gap-3 px-2.5 py-2 rounded-lg border-[1.5px] text-left text-text transition-[border-color,background-color] duration-100 {on
          ? 'border-accent bg-[var(--accent-soft)]'
          : 'border-border bg-transparent hover:bg-bg-hover'}"
        aria-label={`Use ${EDITOR_FONT_LABELS[f]} editor font`}
        aria-pressed={on}
        use:tooltip={{ label: `Use ${EDITOR_FONT_LABELS[f]} editor font`, placement: "left" }}
        onclick={() => { settings.editorFont = f; saveSettings(); }}
      >
        <span class="text-[22px] w-[34px] text-center text-text shrink-0" style="font-family:{EDITOR_FONT_STACKS[f]}">{f === 'mono' ? 'M' : f === 'serif' ? 'S' : 'A'}a</span>
        <span class="flex-1 flex flex-col">
          <span class="text-[13px] font-semibold text-text">{EDITOR_FONT_LABELS[f]}</span>
          <span class="text-[11px] text-text-faint">{EDITOR_FONT_DESCS[f]}</span>
        </span>
        <span class="text-accent flex shrink-0 {on ? 'opacity-100' : 'opacity-0'}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5 7-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>
    {/each}
  </div>
</div>
