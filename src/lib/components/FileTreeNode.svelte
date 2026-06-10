<script lang="ts">
  import { tooltip } from "$lib/actions/tooltip";
  import FileTreeNode from "$lib/components/FileTreeNode.svelte";
  import { untrack } from "svelte";
  import type { FileNode } from "$lib/types";

  let {
    node,
    depth,
    activePath,
    onOpen,
    onCreate,
    onRename,
    onTrash,
    onReveal,
  }: {
    node: FileNode;
    depth: number;
    activePath: string | null;
    onOpen: (path: string) => void;
    onCreate: (dir: string, ext: "md" | "typ") => void;
    onRename: (path: string) => void;
    onTrash: (path: string) => void;
    onReveal: (path: string) => void;
  } = $props();

  let open = $state(untrack(() => depth < 2));

  const displayName = $derived(
    node.isDir ? node.name : node.name.replace(/\.(md|typ)$/, "")
  );

  const isActive = $derived(!node.isDir && activePath === node.path);

  const rowBase =
    "flex items-center gap-[7px] h-[27px] mx-0.5 pr-2 rounded-md text-[13px] whitespace-nowrap relative cursor-pointer";
  const btnReset = "bg-transparent border-0 p-0 text-inherit min-w-0";
  const miniBase = `grid place-items-center w-5 h-5 rounded-[5px] shrink-0 ${btnReset}`;
  const miniColor = $derived(
    isActive
      ? "text-white/85 hover:bg-white/20 hover:text-white"
      : "text-text-faint hover:bg-bg-hover hover:text-text"
  );
</script>

<div class="node">
  {#if node.isDir}
    <div class="group/dir {rowBase} text-text hover:bg-bg-hover" style={`padding-left: ${8 + depth * 14}px`}>
      <button
        class="grid place-items-center w-[13px] h-[27px] text-text-faint shrink-0 -ml-0.5 {btnReset}"
        aria-label={open ? "Collapse folder" : "Expand folder"}
        use:tooltip={{ label: open ? "Collapse folder" : "Expand folder", placement: "right" }}
        onclick={() => (open = !open)}
      >
        <svg width="9" height="9" viewBox="0 0 9 9" class="block" class:rotate-90={open}>
          <path d="M2.5 1.5L6.5 4.5L2.5 7.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <svg class="shrink-0 opacity-85 text-current" width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M2 4.5a1 1 0 011-1h3l1.2 1.4H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
      <button
        class="flex-1 overflow-hidden text-left text-ellipsis whitespace-nowrap font-semibold text-text {btnReset}"
        use:tooltip={{ label: open ? "Collapse folder" : "Expand folder", placement: "right" }}
        onclick={() => (open = !open)}
      >
        {displayName}
      </button>
      <button
        class="{miniBase} text-text-faint opacity-0 group-hover/dir:opacity-100 hover:bg-bg-hover hover:text-text"
        aria-label="New note here"
        use:tooltip={{ label: "New note here", placement: "right" }}
        onclick={() => onCreate(node.path, "md")}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>
  {:else}
    <div
      class="group/file {rowBase} {isActive ? 'bg-accent text-white' : 'text-text hover:bg-bg-hover'}"
      style={`padding-left: ${10 + depth * 14}px`}
    >
      <svg class="shrink-0 text-current {isActive ? 'opacity-100' : 'opacity-85'}" width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M4 1.5h5L13 5.5V14a.5.5 0 01-.5.5h-9A.5.5 0 013 14V2a.5.5 0 01.5-.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M9 1.5V5.5h4" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
      <button
        class="flex-1 overflow-hidden text-left text-ellipsis whitespace-nowrap {btnReset}"
        use:tooltip={{ label: node.path, placement: "right" }}
        onclick={() => onOpen(node.path)}
      >
        {displayName}
      </button>

      <span
        class="text-[9.5px] font-bold tracking-[0.03em] font-[family-name:var(--font-mono)] px-1 py-px rounded shrink-0 group-hover/file:hidden {isActive
          ? 'bg-white/[0.22] text-white/85'
          : 'bg-bg-hover text-text-faint'}"
      >{node.ext}</span>

      <span class="hidden group-hover/file:inline-flex items-center gap-px shrink-0">
        <button
          class="{miniBase} {miniColor}"
          aria-label="Rename note"
          use:tooltip={{ label: "Rename note", placement: "right" }}
          onclick={() => onRename(node.path)}
        >
          <svg width="10" height="10" viewBox="0 0 16 16">
            <path d="M3 11.5V13h1.5L12 5.5 10.5 4 3 11.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            <path d="M9.5 5l1.5 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </button>
        <button
          class="{miniBase} {miniColor}"
          aria-label="Reveal in Finder"
          use:tooltip={{ label: "Reveal in Finder", placement: "right" }}
          onclick={() => onReveal(node.path)}
        >
          <svg width="10" height="10" viewBox="0 0 16 16"><path d="M13 3H3v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 3L5 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
        <button
          class="{miniBase} {isActive ? 'text-white/85' : 'text-text-faint'} hover:bg-[var(--danger-subtle)] hover:text-danger"
          aria-label="Move note to Trash"
          use:tooltip={{ label: "Move note to Trash", placement: "right" }}
          onclick={() => onTrash(node.path)}
        >
          <svg width="10" height="10" viewBox="0 0 16 16"><path d="M3 6l1 8h8l1-8M1 4h14M6 4V2h4v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </span>
    </div>
  {/if}

  {#if node.isDir && open}
    {#each node.children ?? [] as child (child.path)}
      <FileTreeNode
        node={child}
        depth={depth + 1}
        {activePath}
        {onOpen}
        {onCreate}
        {onRename}
        {onTrash}
        {onReveal}
      />
    {/each}
  {/if}
</div>
