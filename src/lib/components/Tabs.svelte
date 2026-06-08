<script lang="ts">
  import type { OpenTab } from "$lib/stores/editor.svelte";

  let {
    tabs,
    activePath,
    onSelect,
    onClose
  }: {
    tabs: OpenTab[];
    activePath: string | null;
    onSelect: (path: string) => void;
    onClose: (path: string) => void;
  } = $props();
</script>

<nav class="tabs" aria-label="Open notes">
  {#each tabs as tab (tab.path)}
    <div class:active={tab.path === activePath} class="tab" title={tab.path}>
      <button class="select" onclick={() => onSelect(tab.path)}>
        <span>{tab.path.split("/").at(-1)}</span>
        {#if tab.dirty}<b>*</b>{/if}
      </button>
      <button class="close" title="Close" onclick={() => onClose(tab.path)}>x</button>
    </div>
  {/each}
</nav>

<style>
  .tabs {
    display: flex;
    min-height: 36px;
    overflow-x: auto;
    border-bottom: 1px solid #cbd4d1;
    background: #eef3f1;
  }

  .tab {
    display: inline-grid;
    grid-template-columns: minmax(48px, 1fr) auto;
    align-items: center;
    gap: 6px;
    max-width: 220px;
    min-width: 112px;
    border-right: 1px solid #cbd4d1;
    color: #17201f;
    font-size: 12px;
  }

  .tab.active {
    background: #ffffff;
  }

  button {
    min-width: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .select {
    display: inline-grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px;
    text-align: left;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  b {
    color: #8a3328;
  }

  .close {
    display: inline-grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    color: #65706d;
  }

  .close:hover {
    background: #dbe7e4;
  }
</style>
