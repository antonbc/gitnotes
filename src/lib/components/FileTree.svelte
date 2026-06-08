<script lang="ts">
  import type { FileNode } from "$lib/types";
  import FileTreeNode from "$lib/components/FileTreeNode.svelte";

  let {
    root,
    activePath,
    onOpen,
    onCreate,
    onTrash,
    onReveal,
  }: {
    root: FileNode | null;
    activePath: string | null;
    onOpen: (path: string) => void;
    onCreate: (dir: string, ext: "md" | "typ") => void;
    onTrash: (path: string) => void;
    onReveal: (path: string) => void;
  } = $props();
</script>

<aside class="tree">
  <div class="tree-header">
    <span class="tree-title">Files</span>
    <div class="new-btns">
      <button title="New Markdown note" onclick={() => onCreate("", "md")}>
        <span class="ext-dot md"></span>md
      </button>
      <button title="New Typst note" onclick={() => onCreate("", "typ")}>
        <span class="ext-dot typ"></span>typ
      </button>
    </div>
  </div>

  <div class="tree-scroll">
    {#if root}
      <FileTreeNode {activePath} node={root} {onOpen} {onCreate} {onTrash} {onReveal} depth={0} />
    {:else}
      <div class="empty">Open a vault to start</div>
    {/if}
  </div>
</aside>

<style>
  .tree {
    display: grid;
    grid-template-rows: auto 1fr;
    min-height: 0;
    background: var(--bg-sidebar);
    border-right: 1px solid var(--border);
  }

  .tree-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    height: 36px;
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
  }

  .tree-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .new-btns {
    display: flex;
    gap: 4px;
  }

  .new-btns button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-input);
    color: var(--text-muted);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
    transition: background var(--transition), border-color var(--transition), color var(--transition);
  }

  .new-btns button:hover {
    border-color: var(--accent);
    background: var(--accent-subtle);
    color: var(--accent);
  }

  .ext-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-block;
  }

  .ext-dot.md   { background: var(--accent); }
  .ext-dot.typ  { background: #9f70d4; }

  .tree-scroll {
    overflow: auto;
    min-height: 0;
  }

  .empty {
    padding: 16px 14px;
    color: var(--text-faint);
    font-size: 12px;
    line-height: 1.5;
  }
</style>
