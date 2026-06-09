<script lang="ts">
  import { tooltip } from "$lib/actions/tooltip";
  import type { FileNode } from "$lib/types";
  import FileTreeNode from "$lib/components/FileTreeNode.svelte";
  import { syncState } from "$lib/stores/sync.svelte";

  let {
    root,
    activePath,
    onOpen,
    onCreate,
    onRename,
    onTrash,
    onReveal,
    onSearchClick,
  }: {
    root: FileNode | null;
    activePath: string | null;
    onOpen: (path: string) => void;
    onCreate: (dir: string, ext: "md" | "typ") => void;
    onRename: (path: string) => void;
    onTrash: (path: string) => void;
    onReveal: (path: string) => void;
    onSearchClick: () => void;
  } = $props();

  function countFiles(node: FileNode | null): number {
    if (!node) return 0;
    if (!node.isDir) return 1;
    return (node.children ?? []).reduce((n, c) => n + countFiles(c), 0);
  }

  const noteCount = $derived(countFiles(root));
</script>

<div class="flex flex-col h-full min-h-0 bg-bg-sidebar">
  <!-- Search field (click → opens palette) -->
  <button
    class="flex items-center gap-[7px] mx-2 mt-2 mb-1 h-7 px-[9px] border border-border rounded-[7px] bg-bg-input text-text-faint text-[12px] cursor-text shrink-0 transition-[border-color] duration-100 hover:border-accent"
    aria-label="Search notes and commands"
    use:tooltip={{ label: "Search notes and commands", shortcut: "⌘K / ⌘P", placement: "right" }}
    onclick={onSearchClick}
  >
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/>
      <path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <span class="flex-1 text-left">Search notes…</span>
    <kbd class="font-[family-name:var(--font-mono)] text-[10px] text-text-faint px-1 py-px border border-border rounded-[3px] bg-bg-hover">⌘P</kbd>
  </button>

  <!-- Section header -->
  <div class="flex items-center justify-between pl-3 pr-2 h-7 shrink-0">
    <span class="text-[11px] font-bold tracking-[0.06em] uppercase text-text-faint">Files</span>
    <div class="flex gap-[3px]">
      <button
        class="inline-flex items-center gap-[3px] h-[22px] px-1.5 border border-border rounded bg-transparent text-text-faint text-[10.5px] transition-[border-color,color,background-color] duration-100 enabled:hover:border-accent enabled:hover:text-accent enabled:hover:bg-accent-sub disabled:opacity-45 disabled:cursor-default"
        aria-label={root ? "New Markdown note" : "Open a vault before creating notes"}
        use:tooltip={{ label: root ? "New Markdown note" : "Open a vault before creating notes", shortcut: root ? "⌘N" : undefined, placement: "bottom" }}
        disabled={!root}
        onclick={() => onCreate("", "md")}
      >
        <span class="w-[5px] h-[5px] rounded-full inline-block shrink-0 bg-accent"></span>md
      </button>
      <button
        class="inline-flex items-center gap-[3px] h-[22px] px-1.5 border border-border rounded bg-transparent text-text-faint text-[10.5px] transition-[border-color,color,background-color] duration-100 enabled:hover:border-accent enabled:hover:text-accent enabled:hover:bg-accent-sub disabled:opacity-45 disabled:cursor-default"
        aria-label={root ? "New Typst note" : "Open a vault before creating notes"}
        use:tooltip={{ label: root ? "New Typst note" : "Open a vault before creating notes", placement: "bottom" }}
        disabled={!root}
        onclick={() => onCreate("", "typ")}
      >
        <span class="w-[5px] h-[5px] rounded-full inline-block shrink-0 bg-[#9f70d4]"></span>typ
      </button>
    </div>
  </div>

  <!-- File tree body -->
  <div class="flex-1 overflow-y-auto min-h-0">
    {#if root}
      <FileTreeNode
        {activePath}
        node={root}
        {onOpen}
        {onCreate}
        {onRename}
        {onTrash}
        {onReveal}
        depth={0}
      />
    {:else}
      <div class="flex flex-col items-center gap-2.5 px-4 py-8 text-text-faint text-[12px] text-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="4" width="20" height="20" rx="4" stroke="currentColor" stroke-width="1.4"/>
          <path d="M9 10h10M9 14h7M9 18h9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span>Open a vault to start</span>
      </div>
    {/if}
  </div>

  <!-- Footer -->
  <div class="flex items-center justify-between h-7 px-3 border-t border-border-sub shrink-0">
    {#if syncState.status}
      <span class="inline-flex items-center gap-1 text-[11.5px] text-text-muted">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <circle cx="4" cy="4" r="1.5" stroke="currentColor" stroke-width="1.3"/>
          <circle cx="4" cy="12" r="1.5" stroke="currentColor" stroke-width="1.3"/>
          <circle cx="12" cy="4" r="1.5" stroke="currentColor" stroke-width="1.3"/>
          <path d="M4 5.5v5M5.5 4h3a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M11 9.5l1 1.5 1-1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {syncState.status.branch}
      </span>
    {:else}
      <span class="inline-flex items-center gap-1 text-[11.5px] text-text-faint">local</span>
    {/if}
    <span class="text-[11px] text-text-faint">{noteCount} notes</span>
  </div>
</div>
