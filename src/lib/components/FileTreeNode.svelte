<script lang="ts">
  import FileTreeNode from "$lib/components/FileTreeNode.svelte";
  import { untrack } from "svelte";
  import type { FileNode } from "$lib/types";

  let {
    node,
    depth,
    activePath,
    onOpen,
    onCreate,
    onTrash,
    onReveal,
  }: {
    node: FileNode;
    depth: number;
    activePath: string | null;
    onOpen: (path: string) => void;
    onCreate: (dir: string, ext: "md" | "typ") => void;
    onTrash: (path: string) => void;
    onReveal: (path: string) => void;
  } = $props();

  let open = $state(untrack(() => depth < 2));
</script>

<div class="node">
  <div
    class:active={activePath === node.path}
    class="row"
    style={`padding-left: ${10 + depth * 16}px`}
  >
    {#if node.isDir}
      <button class="twisty" title="Toggle folder" onclick={() => (open = !open)}>
        <svg width="9" height="9" viewBox="0 0 9 9" class:open style="display:block">
          <path d="M2.5 1.5L6.5 4.5L2.5 7.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button
        class="name dir"
        title={node.path || node.name}
        ondblclick={() => onCreate(node.path, "md")}
        onclick={() => (open = !open)}
      >
        {node.name}
      </button>
      <button class="mini" title="New note here" onclick={() => onCreate(node.path, "md")}>+</button>
    {:else}
      <span class="twisty dot-wrap">
        <span class="file-dot {node.ext}"></span>
      </span>
      <button class="name" title={node.path} onclick={() => onOpen(node.path)}>
        {node.name}
      </button>
      <button class="mini" title="Reveal in Finder" onclick={() => onReveal(node.path)}>
        <svg width="10" height="10" viewBox="0 0 16 16"><path d="M13 3H3v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 3L5 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
      <button class="mini danger" title="Trash" onclick={() => onTrash(node.path)}>
        <svg width="10" height="10" viewBox="0 0 16 16"><path d="M3 6l1 8h8l1-8M1 4h14M6 4V2h4v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    {/if}
  </div>

  {#if node.isDir && open}
    {#each node.children ?? [] as child (child.path)}
      <FileTreeNode
        node={child}
        depth={depth + 1}
        {activePath}
        {onOpen}
        {onCreate}
        {onTrash}
        {onReveal}
      />
    {/each}
  {/if}
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 2px;
    min-height: 30px;
    border-radius: 0;
    color: var(--text-muted);
    cursor: default;
    transition: background var(--transition);
  }

  .row:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .row.active {
    background: var(--bg-active);
    color: var(--text);
    border-left: 2px solid var(--accent);
  }

  button {
    min-width: 0;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    padding: 0;
  }

  .twisty {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    color: var(--text-faint);
    flex-shrink: 0;
  }

  .dot-wrap {
    display: grid;
    place-items: center;
  }

  .file-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: block;
  }

  .file-dot.md   { background: var(--accent); opacity: 0.75; }
  .file-dot.typ  { background: #9f70d4; opacity: 0.75; }

  svg.open {
    transform: rotate(90deg);
  }

  .name {
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    padding: 0 2px;
    line-height: 30px;
  }

  .dir {
    font-weight: 600;
    color: var(--text);
  }

  .mini {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: var(--radius-sm);
    color: var(--text-faint);
    opacity: 0;
    transition: opacity var(--transition), background var(--transition), color var(--transition);
  }

  .mini:hover {
    background: var(--bg-hover);
    color: var(--text-muted);
    opacity: 1;
  }

  .mini.danger:hover {
    background: var(--danger-subtle);
    color: var(--danger);
  }

  .row:hover .mini {
    opacity: 1;
  }
</style>
