<script lang="ts">
  import { tooltip } from "$lib/actions/tooltip";

  let {
    conflicts,
    activeContent,
    onOpen,
    onResolve,
  }: {
    conflicts: string[];
    activeContent: string;
    onOpen: (path: string) => void;
    onResolve: () => void;
  } = $props();
</script>

{#if conflicts.length}
  <div
    class="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-[12px]"
    style="background:var(--danger-subtle); border-color:var(--danger); color:var(--danger)"
  >
    <svg width="13" height="13" viewBox="0 0 16 16" class="shrink-0">
      <path d="M8 2L14.9 14H1.1L8 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M8 7v3M8 12v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <span class="font-semibold">
      {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"}
    </span>

    {#each conflicts as path}
      <button
        class="max-w-[200px] truncate rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors"
        style="border-color:var(--danger); color:var(--danger)"
        aria-label={`Open conflicted note ${path}`}
        use:tooltip={{ label: "Open conflicted note", placement: "bottom" }}
        onmouseenter={(e) => (e.currentTarget.style.background = 'var(--danger-subtle)')}
        onmouseleave={(e) => (e.currentTarget.style.background = 'transparent')}
        onclick={() => onOpen(path)}
        title={path}
      >{path}</button>
    {/each}

    <button
      class="ml-auto rounded-md border px-3 py-1 font-semibold transition-colors disabled:opacity-40"
      style="border-color:var(--danger); color:var(--danger)"
      disabled={!activeContent}
      aria-label="Mark active conflict resolved"
      use:tooltip={{ label: activeContent ? "Mark active conflict resolved" : "Open a conflicted note first", placement: "bottom" }}
      onmouseenter={(e) => { if (activeContent) e.currentTarget.style.background = 'var(--danger-subtle)'; }}
      onmouseleave={(e) => (e.currentTarget.style.background = 'transparent')}
      onclick={onResolve}
    >Mark resolved</button>
  </div>
{/if}
