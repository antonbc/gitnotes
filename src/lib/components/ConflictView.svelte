<script lang="ts">
  let {
    conflicts,
    activeContent,
    onOpen,
    onResolve
  }: {
    conflicts: string[];
    activeContent: string;
    onOpen: (path: string) => void;
    onResolve: () => void;
  } = $props();
</script>

{#if conflicts.length}
  <section class="conflicts">
    <div>
      <strong>Conflicts</strong>
      <span>{conflicts.length} file{conflicts.length === 1 ? "" : "s"}</span>
    </div>
    {#each conflicts as path}
      <button onclick={() => onOpen(path)}>{path}</button>
    {/each}
    <button class="resolve" disabled={!activeContent} onclick={onResolve}>Mark Active Resolved</button>
  </section>
{/if}

<style>
  .conflicts {
    display: grid;
    gap: 6px;
    padding: 10px;
    border-bottom: 1px solid #e2b5aa;
    background: #fff4f1;
  }

  div {
    display: flex;
    justify-content: space-between;
    color: #8a3328;
    font-size: 12px;
  }

  button {
    min-height: 28px;
    border: 1px solid #e2b5aa;
    border-radius: 6px;
    background: #ffffff;
    color: #4b2923;
    text-align: left;
    cursor: pointer;
  }

  .resolve {
    text-align: center;
    font-weight: 650;
  }
</style>
