<script lang="ts">
  import Fuse from "fuse.js";
  import type { FileNode } from "$lib/types";

  let {
    open,
    tree,
    onClose,
    onOpen
  }: {
    open: boolean;
    tree: FileNode | null;
    onClose: () => void;
    onOpen: (path: string) => void;
  } = $props();

  let query = $state("");
  let input = $state<HTMLInputElement | null>(null);

  const files = $derived(flatten(tree));
  const fuse = $derived(new Fuse(files, { keys: ["path", "name"], threshold: 0.36 }));
  const results = $derived(query.trim() ? fuse.search(query).map((hit) => hit.item).slice(0, 20) : files.slice(0, 20));

  $effect(() => {
    if (open) {
      query = "";
      window.setTimeout(() => input?.focus(), 0);
    }
  });

  function choose(path: string) {
    onOpen(path);
    onClose();
  }

  function flatten(root: FileNode | null): FileNode[] {
    if (!root) return [];
    const out: FileNode[] = [];
    const walk = (node: FileNode) => {
      if (node.ext) out.push(node);
      for (const child of node.children ?? []) walk(child);
    };
    walk(root);
    return out;
  }
</script>

{#if open}
  <div
    class="scrim"
    role="button"
    tabindex="0"
    onclick={onClose}
    onkeydown={(event) => event.key === "Escape" && onClose()}
  >
    <section
      class="palette"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onkeydown={(event) => event.stopPropagation()}
      onclick={(event) => event.stopPropagation()}
    >
      <input
        bind:this={input}
        bind:value={query}
        placeholder="Find note"
        onkeydown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "Enter" && results[0]) choose(results[0].path);
        }}
      />
      <div class="results">
        {#each results as file (file.path)}
          <button onclick={() => choose(file.path)}>
            <strong>{file.name}</strong>
            <span>{file.path}</span>
          </button>
        {/each}
      </div>
    </section>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: grid;
    align-items: start;
    justify-items: center;
    padding-top: 12vh;
    background: rgba(23, 32, 31, 0.24);
  }

  .palette {
    width: min(640px, calc(100vw - 24px));
    overflow: hidden;
    border: 1px solid #b8c6c2;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 18px 50px rgba(23, 32, 31, 0.2);
  }

  input {
    width: 100%;
    height: 44px;
    box-sizing: border-box;
    border: 0;
    border-bottom: 1px solid #cbd4d1;
    padding: 0 14px;
    background: transparent;
    font: inherit;
    outline: none;
  }

  .results {
    max-height: 420px;
    overflow: auto;
  }

  button {
    display: grid;
    width: 100%;
    gap: 2px;
    border: 0;
    padding: 9px 14px;
    background: transparent;
    color: #17201f;
    text-align: left;
    cursor: pointer;
  }

  button:hover {
    background: #e8f3f1;
  }

  span {
    color: #65706d;
    font-size: 12px;
  }
</style>
