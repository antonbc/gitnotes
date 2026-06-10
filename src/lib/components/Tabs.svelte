<script lang="ts">
  import { tooltip } from "$lib/actions/tooltip";
  import type { OpenTab } from "$lib/stores/editor.svelte";

  let {
    tabs,
    activePath,
    onSelect,
    onClose,
    onRename,
    onReload,
    canCreate,
    onNew,
  }: {
    tabs: OpenTab[];
    activePath: string | null;
    onSelect: (path: string) => void;
    onClose: (path: string) => void;
    onRename: (path: string) => void;
    onReload: (path: string) => void;
    canCreate: boolean;
    onNew: () => void;
  } = $props();
</script>

<div class="flex items-end min-h-[38px] bg-[var(--bg-toolbar)] border-b border-border overflow-x-auto shrink-0" role="tablist" aria-label="Open notes">
  {#each tabs as tab (tab.path)}
    {@const active = tab.path === activePath}
    {@const name = tab.path.split("/").at(-1) ?? tab.path}
    <div
      class="group/tab relative inline-flex items-center min-w-[120px] max-w-[220px] h-[38px] border-r border-border text-[12.5px] cursor-default shrink-0 {active
        ? 'bg-[var(--tab-active)] text-text'
        : 'text-text-muted hover:bg-bg-hover hover:text-text'}"
      role="tab"
      aria-selected={active}
    >
      <!-- Top accent line -->
      {#if active}
        <span class="absolute -bottom-[0.5px] left-0 right-0 h-[1.5px] bg-accent"></span>
      {/if}

      <button
        class="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left border-0 bg-transparent text-inherit pl-3 pr-1.5 h-full cursor-pointer"
        use:tooltip={{ label: `${tab.path} — double-click to rename`, placement: "bottom" }}
        onclick={() => onSelect(tab.path)}
        ondblclick={() => onRename(tab.path)}
      >
        {name}
      </button>

      {#if tab.diskStale}
        <button
          class="w-[18px] h-[18px] grid place-items-center border-0 rounded bg-warn text-white text-[11px] font-extrabold leading-none cursor-pointer shrink-0 mr-1"
          aria-label="Reload note from disk"
          use:tooltip={{ label: "Changed on disk — click to reload", placement: "bottom" }}
          onclick={(e) => { e.stopPropagation(); onReload(tab.path); }}
        >!</button>
      {/if}

      <!-- dirty = dot, clean = × (on hover) -->
      {#if tab.dirty}
        <button
          class="w-5 h-5 grid place-items-center border-0 bg-transparent cursor-pointer shrink-0 mr-1.5"
          aria-label="Close unsaved tab"
          use:tooltip={{ label: active ? "Close current tab" : "Close tab", shortcut: active ? "⌘W" : undefined }}
          onclick={() => onClose(tab.path)}
        >
          <span class="block w-[7px] h-[7px] rounded-full {active ? 'bg-text' : 'bg-text-muted'}"></span>
        </button>
      {:else}
        <button
          class="w-5 h-5 grid place-items-center border-0 rounded bg-transparent text-text-faint cursor-pointer shrink-0 mr-1.5 opacity-0 group-hover/tab:opacity-100 transition-[opacity,background-color,color] duration-100 hover:bg-bg-hover hover:text-text"
          aria-label="Close tab"
          use:tooltip={{ label: active ? "Close current tab" : "Close tab", shortcut: active ? "⌘W" : undefined }}
          onclick={(e) => { e.stopPropagation(); onClose(tab.path); }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9">
            <path d="M1.5 1.5l6 6M7.5 1.5l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      {/if}
    </div>
  {/each}

  <!-- New tab button -->
  <button
    class="w-[38px] h-[38px] grid place-items-center border-0 bg-transparent text-text-faint transition-[background-color,color] duration-100 enabled:hover:bg-bg-hover enabled:hover:text-text-muted disabled:opacity-45 disabled:cursor-default"
    aria-label={canCreate ? "New Markdown note" : "Open a vault before creating notes"}
    use:tooltip={{ label: canCreate ? "New Markdown note" : "Open a vault before creating notes", shortcut: canCreate ? "⌘N" : undefined }}
    disabled={!canCreate}
    onclick={onNew}
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  </button>
</div>
