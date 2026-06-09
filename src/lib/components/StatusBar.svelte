<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip';
  import { canCommitPush } from '$lib/git/commit';
  import { settings } from '$lib/stores/settings.svelte';
  import { editorState } from '$lib/stores/editor.svelte';
  import { syncState } from '$lib/stores/sync.svelte';
  import { vaultState } from '$lib/stores/vault.svelte';

  let {
    onPull,
    onCommitPush,
    onSaveDisk,
    onRefreshGit,
    onConvertVault,
    onAutosaveToggle,
  }: {
    onPull: () => Promise<void>;
    onCommitPush: () => Promise<void>;
    onSaveDisk: () => Promise<void>;
    onRefreshGit: () => Promise<void>;
    onConvertVault: () => Promise<void>;
    onAutosaveToggle: () => void;
  } = $props();

  let menuOpen = $state(false);

  // shared utility-class fragments (Tailwind)
  const stItem =
    "inline-flex items-center justify-center px-2 h-6 leading-none whitespace-nowrap [&_svg]:block [&_svg]:shrink-0";
  const stBtn =
    "cursor-pointer border-0 bg-transparent text-inherit text-[11.5px] transition-colors duration-100 enabled:hover:bg-bg-hover disabled:opacity-50 disabled:cursor-default";
  const mono = `${stItem} gap-1 font-[family-name:var(--font-mono)] text-[11px]`;
  const menuItem =
    "flex items-center gap-2.5 w-full px-2.5 py-2 border-0 rounded-[7px] bg-transparent text-text text-[12.5px] text-left cursor-pointer transition-colors duration-100 [&_svg]:text-text-muted [&_svg]:shrink-0";

  const dirtyCount = $derived(editorState.tabs.filter(t => t.dirty).length);
  const pushCount  = $derived(editorState.localChanges.size);
  const gitDirty = $derived(syncState.status?.dirty ?? false);
  const aheadCount = $derived(syncState.status?.ahead ?? 0);
  const needsCommit = $derived(
    canCommitPush({
      status: syncState.status,
      conflicts: syncState.conflicts,
      dirtyTabCount: dirtyCount,
      localChangeCount: pushCount,
    })
  );
  // save-status badge
  const saveStatus = $derived((): { label: string; color: string; spin?: boolean; detail?: string | null } => {
    if (editorState.saveError)
      return { label: 'save failed', color: 'var(--danger)', detail: editorState.saveError };
    if (syncState.syncError)
      return { label: 'sync failed', color: 'var(--danger)', detail: syncState.syncError };
    if (dirtyCount > 0 && editorState.saving)
      return { label: 'Auto-saving…', color: 'var(--accent)', spin: true };
    if (dirtyCount > 0)
      return { label: `${dirtyCount} unsaved`, color: 'var(--warn)' };
    if (pushCount > 0 || gitDirty || aheadCount > 0)
      return { label: 'to push', color: 'var(--warn)' };
    return { label: 'in sync', color: 'var(--ok)' };
  });

  const vimLabel = $derived((): { text: string; bg: string } => {
    if (!editorState.vimMode) return { text: 'VIM OFF', bg: 'var(--text-faint)' };
    return { text: 'NORMAL', bg: 'var(--ok)' };
  });

  function toggleAutosave() {
    onAutosaveToggle();
  }

  async function runMenu(fn: () => Promise<void>) {
    menuOpen = false;
    try {
      await fn();
    } catch {
      // Errors are stored on editorState.saveError or syncState.syncError.
    }
  }
</script>

<footer class="flex items-center h-[26px] px-1 bg-[var(--bg-statusbar)] border-t-[0.5px] border-border text-[11.5px] text-text-muted shrink-0 select-none">
  <!-- Left cluster -->
  <div class="flex items-center min-h-6">
    {#if syncState.status}
      <button
        class="{stItem} gap-[5px] {stBtn}"
        aria-label="Refresh Git status"
        use:tooltip={{ label: "Refresh Git status", placement: "top" }}
        onclick={() => runMenu(onRefreshGit)}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <circle cx="4" cy="4" r="1.6" stroke="currentColor" stroke-width="1.4"/>
          <circle cx="4" cy="12" r="1.6" stroke="currentColor" stroke-width="1.4"/>
          <circle cx="12" cy="4" r="1.6" stroke="currentColor" stroke-width="1.4"/>
          <path d="M4 5.6v4.8M5.6 4h3a2 2 0 012 2v1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M11 9l1 1.5 1-1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {syncState.status.branch}
        {#if syncState.status.ahead > 0}
          <span class="text-[10px] font-bold px-[3px] rounded-[3px] bg-bg-hover min-h-[14px] leading-[14px] inline-flex items-center">{syncState.status.ahead}↑</span>
        {/if}
        {#if syncState.status.behind > 0}
          <span class="text-[10px] font-bold px-[3px] rounded-[3px] bg-bg-hover min-h-[14px] leading-[14px] inline-flex items-center">{syncState.status.behind}↓</span>
        {/if}
      </button>
    {/if}

    <!-- Save status -->
    <span
      class="{stItem} gap-[5px]"
      style="color:{saveStatus().color}"
      title={saveStatus().detail ?? undefined}
    >
      {#if saveStatus().spin}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style="animation:spin 1s linear infinite">
          <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.5-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.5 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      {:else if saveStatus().label === 'in sync'}
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5 7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      {:else}
        <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:{saveStatus().color}"></span>
      {/if}
      {saveStatus().label}
    </span>

    <!-- Save/Sync menu anchor -->
    <div class="relative">
      <button
        class="{stItem} gap-1 {stBtn} {menuOpen ? 'bg-bg-hover brightness-90' : ''}"
        onclick={() => (menuOpen = !menuOpen)}
        disabled={!vaultState.info}
        aria-label="Save and sync"
        use:tooltip={{ label: vaultState.info ? "Save and sync" : "Open a vault before syncing", placement: "top" }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M8 1l4 4H9v6H7V5H4L8 1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M2 13h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        Save / Sync
        <svg width="10" height="10" viewBox="0 0 10 10" style="opacity:.6">
          <path d="M2 6.5l3-3 3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      {#if menuOpen}
        <!-- click-away scrim -->
        <div
          class="fixed inset-0 z-30"
          role="button"
          tabindex="-1"
          onclick={() => (menuOpen = false)}
          onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)}
        ></div>

        <!-- upward menu -->
        <div class="absolute bottom-[calc(100%+6px)] left-0 w-[300px] z-40 bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] p-1.5 animate-[pop-up_0.14s_cubic-bezier(0.2,0.7,0.3,1)]">
          <div class="text-[10.5px] font-bold tracking-[0.04em] text-text-faint pt-[7px] px-2.5 pb-[3px]">Save locally</div>

          <button
            class="{menuItem} enabled:hover:bg-bg-hover disabled:opacity-45 disabled:cursor-default"
            disabled={dirtyCount === 0}
            use:tooltip={{ label: "Save all open notes", shortcut: "⌘S", placement: "right" }}
            onclick={() => runMenu(onSaveDisk)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M5 2v5h6V2" stroke="currentColor" stroke-width="1.4"/><path d="M4 10h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            <span class="flex flex-col flex-1 gap-px">
              <span>Save to disk</span>
              <span class="text-[10.5px] text-text-faint">Atomic write into vault folder</span>
            </span>
            <kbd class="font-[family-name:var(--font-mono)] text-[10px] text-text-faint ml-auto px-1 py-px rounded-[3px] border border-border">⌘S</kbd>
          </button>

          <div class="h-px bg-border-sub mx-2 my-1"></div>
          <div class="text-[10.5px] font-bold tracking-[0.04em] text-text-faint pt-[7px] px-2.5 pb-[3px]">Sync with remote</div>

          {#if !syncState.status}
            <div class="flex gap-1.5 px-2.5 pt-1 pb-1.5">
              <input
                class="flex-1 h-7 border border-border rounded-md px-2 bg-bg-input text-text text-[12px] outline-none transition-[border-color] duration-100 focus:border-accent"
                bind:value={syncState.remoteInput}
                placeholder="Git remote URL"
              />
              <button
                class="h-7 px-2.5 border-0 rounded-md bg-accent text-white text-[12px] font-medium cursor-pointer transition-colors duration-100 enabled:hover:bg-accent-hover disabled:bg-bg-hover disabled:text-text-faint disabled:cursor-default"
                disabled={!syncState.remoteInput.trim()}
                use:tooltip={{ label: "Connect Git remote", placement: "top" }}
                onclick={() => runMenu(onConvertVault)}
              >
                Connect
              </button>
            </div>
          {:else}
            <button
              class="{menuItem} enabled:hover:bg-bg-hover disabled:opacity-45 disabled:cursor-default"
              disabled={!needsCommit}
              use:tooltip={{ label: "Commit and push", shortcut: "⇧⌘S", placement: "right" }}
              onclick={() => runMenu(onCommitPush)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1l3 3H9v6H7V4H5l3-3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M1 13h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              <span class="flex flex-col flex-1 gap-px">
                <span>Commit &amp; push</span>
                <span class="text-[10.5px] text-text-faint">Send changes to remote</span>
              </span>
              <kbd class="font-[family-name:var(--font-mono)] text-[10px] text-text-faint ml-auto px-1 py-px rounded-[3px] border border-border">⇧⌘S</kbd>
            </button>

            <div class="flex gap-1.5 px-2.5 pt-1 pb-1.5">
              <input
                class="flex-1 h-7 border border-border rounded-md px-2 bg-bg-input text-text text-[12px] outline-none transition-[border-color] duration-100 focus:border-accent"
                bind:value={syncState.message}
                placeholder="Commit message (optional)"
              />
            </div>

            <button
              class="{menuItem} hover:bg-bg-hover"
              use:tooltip={{ label: "Pull from remote", placement: "right" }}
              onclick={() => runMenu(onPull)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 15l-3-3h2V6h2v6h2l-3 3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M1 3h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              <span class="flex flex-col flex-1 gap-px">
                <span>Pull from remote</span>
                <span class="text-[10.5px] text-text-faint">Fetch &amp; merge origin</span>
              </span>
            </button>
          {/if}

          <div class="h-px bg-border-sub mx-2 my-1"></div>

          <!-- Autosave toggle -->
          <button
            class="{menuItem} hover:bg-bg-hover"
            use:tooltip={{ label: settings.autosave ? "Turn off autosave" : "Turn on autosave", placement: "right" }}
            onclick={toggleAutosave}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="color:{settings.autosave ? 'var(--ok)' : 'var(--text-faint)'}">
              <path d="M3 8l3.5 3.5 7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="flex flex-col flex-1 gap-px">
              <span>Auto-save</span>
              <span class="text-[10.5px] text-text-faint">Write to disk ~0.5s after typing</span>
            </span>
            <span class="w-9 h-5 rounded-full relative shrink-0 transition-colors duration-100 {settings.autosave ? 'bg-ok' : 'bg-border'}">
              <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-100 {settings.autosave ? 'translate-x-4' : ''}"></span>
            </span>
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Spacer -->
  <div class="flex-1"></div>

  <!-- Right cluster -->
  <div class="flex items-center min-h-6">
    {#if editorState.tabs.find(t => t.path === editorState.activePath)?.ext}
      <span class={mono}>{editorState.tabs.find(t => t.path === editorState.activePath)?.ext?.toUpperCase()}</span>
    {/if}

    <span class={mono}>
      Ln {editorState.cursor.ln}, Col {editorState.cursor.col}
    </span>

    {#if editorState.selection.chars > 0}
      <span class={mono}>{editorState.selection.chars} selected</span>
    {/if}

    {#if editorState.lineCount > 0}
      <span class={mono}>{editorState.lineCount}l</span>
    {/if}

    {#if editorState.wordCount > 0}
      <span class={mono}>{editorState.wordCount}w</span>
    {/if}

    {#if editorState.charCount > 0}
      <span class={mono}>{editorState.charCount}ch</span>
    {/if}

    <button
      class="inline-flex items-center justify-center font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-[0.04em] leading-none text-white rounded-[3px] px-1.5 h-[18px] min-w-[56px] mx-1 cursor-pointer border-0 transition-colors duration-100"
      style="background:{vimLabel().bg}"
      onclick={() => { editorState.vimMode = !editorState.vimMode; }}
      aria-label={editorState.vimMode ? "Disable Vim mode" : "Enable Vim mode"}
      use:tooltip={{ label: editorState.vimMode ? "Disable Vim mode" : "Enable Vim mode", placement: "top" }}
    >{vimLabel().text}</button>
  </div>
</footer>
