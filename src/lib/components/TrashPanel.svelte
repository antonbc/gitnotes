<script lang="ts">
  import { tooltip } from "$lib/actions/tooltip";
  import { errorMessage } from "$lib/errors";
  import { ipc } from "$lib/ipc";
  import type { TrashEntry } from "$lib/types";

  let {
    open,
    onClose,
    onRestored,
  }: {
    open: boolean;
    onClose: () => void;
    onRestored: (originalPath: string) => void | Promise<void>;
  } = $props();

  let entries = $state<TrashEntry[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let restoringId = $state<string | null>(null);

  $effect(() => {
    if (!open) return;
    error = null;
    void refresh();
  });

  async function refresh() {
    loading = true;
    try {
      const list = await ipc.listTrash();
      entries = list.sort((a, b) => Number(b.deletedAt) - Number(a.deletedAt));
    } catch (err) {
      error = errorMessage(err);
      entries = [];
    } finally {
      loading = false;
    }
  }

  async function restore(entry: TrashEntry) {
    restoringId = entry.trashId;
    error = null;
    try {
      await ipc.restoreFile(entry.trashId);
      entries = entries.filter((item) => item.trashId !== entry.trashId);
      await onRestored(entry.originalPath);
    } catch (err) {
      error = errorMessage(err);
    } finally {
      restoringId = null;
    }
  }

  function fileName(path: string) {
    return path.split("/").at(-1) ?? path;
  }

  function deletedLabel(deletedAt: string) {
    const seconds = Number(deletedAt);
    if (!Number.isFinite(seconds) || seconds <= 0) return "Unknown date";
    const elapsed = Date.now() / 1000 - seconds;
    if (elapsed < 60) return "Just now";
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)} min ago`;
    if (elapsed < 86400) return `${Math.floor(elapsed / 3600)} h ago`;
    if (elapsed < 86400 * 7) return `${Math.floor(elapsed / 86400)} d ago`;
    return new Date(seconds * 1000).toLocaleDateString();
  }
</script>

{#if open}
  <!-- Scrim -->
  <div
    class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh]"
    style="background:rgba(0,0,0,.35); backdrop-filter:blur(2px)"
    role="button"
    tabindex="-1"
    onclick={onClose}
    onkeydown={(e) => e.key === "Escape" && onClose()}
  >
    <!-- Panel -->
    <div
      class="w-full max-w-[520px] overflow-hidden"
      style="
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
      "
      role="dialog"
      aria-modal="true"
      aria-label="Trash"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => { e.stopPropagation(); if (e.key === "Escape") onClose(); }}
    >
      <!-- Header -->
      <div class="flex items-center gap-2 border-b px-4 h-11" style="border-color:var(--border)">
        <svg width="14" height="14" viewBox="0 0 16 16" class="shrink-0" style="color:var(--text-faint)">
          <path d="M3 6l1 8h8l1-8M1 4h14M6 4V2h4v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="flex-1 text-[13.5px] font-semibold" style="color:var(--text)">Trash</span>
        <span class="text-[11.5px]" style="color:var(--text-faint)">
          {entries.length} item{entries.length === 1 ? "" : "s"}
        </span>
        <kbd class="rounded px-1.5 py-0.5 text-[10px]" style="background:var(--bg-hover); color:var(--text-faint)">ESC</kbd>
      </div>

      {#if error}
        <div class="px-4 py-2 text-[12px]" style="background:var(--danger-subtle); color:var(--danger)">{error}</div>
      {/if}

      <!-- Entries -->
      <div class="max-h-[380px] overflow-y-auto py-1">
        {#each entries as entry (entry.trashId)}
          <div class="flex w-full items-center gap-3 px-4 py-2">
            <svg class="shrink-0" width="14" height="14" viewBox="0 0 16 16" fill="none" style="color:var(--text-faint)">
              <path d="M4 1.5h5L13 5.5V14a.5.5 0 01-.5.5h-9A.5.5 0 013 14V2a.5.5 0 01.5-.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
              <path d="M9 1.5V5.5h4" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
            </svg>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[13px]" style="color:var(--text)">{fileName(entry.originalPath)}</span>
              <span class="block truncate text-[11px]" style="color:var(--text-faint)">
                {entry.originalPath} · {deletedLabel(entry.deletedAt)}
              </span>
            </span>
            <button
              class="shrink-0 rounded-md border px-2.5 py-1 text-[11.5px] font-semibold transition-colors disabled:opacity-50"
              style="border-color:var(--border); color:var(--text)"
              disabled={restoringId !== null}
              aria-label={`Restore ${fileName(entry.originalPath)}`}
              use:tooltip={{ label: "Restore to vault", placement: "left" }}
              onmouseenter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onmouseleave={(e) => (e.currentTarget.style.background = 'transparent')}
              onclick={() => restore(entry)}
            >{restoringId === entry.trashId ? "Restoring…" : "Restore"}</button>
          </div>
        {:else}
          <p class="px-4 py-6 text-center text-[13px]" style="color:var(--text-faint)">
            {loading ? "Loading…" : "Trash is empty"}
          </p>
        {/each}
      </div>
    </div>
  </div>
{/if}
