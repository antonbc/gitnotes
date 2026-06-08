<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { onDestroy, onMount } from "svelte";
  import ConflictView from "$lib/components/ConflictView.svelte";
  import FileTree from "$lib/components/FileTree.svelte";
  import Palette from "$lib/components/Palette.svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import Toolbar from "$lib/components/Toolbar.svelte";
  import NoteEditor from "$lib/editor/NoteEditor.svelte";
  import { ipc } from "$lib/ipc";
  import PreviewPane from "$lib/preview/PreviewPane.svelte";
  import { editorState, type OpenTab } from "$lib/stores/editor.svelte";
  import { searchState } from "$lib/stores/search.svelte";
  import { syncState } from "$lib/stores/sync.svelte";
  import { vaultState } from "$lib/stores/vault.svelte";
  import type { Ext, FormatAction, TrashEntry, ViewMode } from "$lib/types";

  let editorRef = $state<any>(null);
  let autosaveTimer: number | null = null;
  let statusMessage = $state("");
  let openPathInput = $state("");
  let newName = $state("Untitled");
  let trash = $state<TrashEntry[]>([]);
  let searchBusy = $state(false);

  const activeTab = $derived(
    editorState.tabs.find((tab) => tab.path === editorState.activePath) ?? null
  );
  const activeExt = $derived(activeTab?.ext ?? null);

  onMount(() => {
    let unlistenVault: (() => void) | null = null;
    let unlistenIndex: (() => void) | null = null;
    const isTauri = Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

    void (async () => {
      if (isTauri) {
        vaultState.ping = await ipc.ping();
        syncState.gitAvailable = await ipc.checkGitAvailable();
      } else {
        vaultState.ping = "browser preview";
        syncState.gitAvailable = false;
      }

      if (isTauri) {
        unlistenVault = await listen<{ paths: string[] }>("vault_changed", async (event) => {
          await refreshTree();
          void ipc.reindex();
          for (const path of event.payload.paths) {
            const tab = editorState.tabs.find((item) => item.path === path);
            if (tab && !tab.dirty) {
              try {
                const fresh = await ipc.readFile(path);
                tab.content = fresh.content;
                tab.savedContent = fresh.content;
              } catch {
                closeTab(path);
              }
            }
          }
        });

        unlistenIndex = await listen<{ done: number; total: number }>("index_progress", (event) => {
          vaultState.indexProgress = event.payload;
        });
      }
    })();

    const keyHandler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        searchState.paletteOpen = true;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveActive();
      }
    };
    const beforeUnload = () => {
      void Promise.all(editorState.tabs.filter((tab) => tab.dirty).map(saveTab));
    };
    window.addEventListener("keydown", keyHandler);
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      unlistenVault?.();
      unlistenIndex?.();
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  });

  onDestroy(() => {
    if (autosaveTimer) window.clearTimeout(autosaveTimer);
  });

  async function pickVault() {
    const info = await ipc.pickAndOpenVault();
    if (!info) return;
    vaultState.info = info;
    openPathInput = info.root;
    await afterVaultOpened();
  }

  async function openVaultFromInput() {
    if (!openPathInput.trim()) return;
    vaultState.info = await ipc.openVault(openPathInput.trim());
    await afterVaultOpened();
  }

  async function afterVaultOpened() {
    await refreshTree();
    await refreshGitStatus();
    trash = await ipc.listTrash();
    statusMessage = "Vault ready";
  }

  async function refreshTree() {
    if (!vaultState.info) return;
    vaultState.tree = await ipc.listFiles();
  }

  async function openFile(path: string) {
    const existing = editorState.tabs.find((tab) => tab.path === path);
    if (existing) {
      editorState.activePath = path;
      return;
    }
    const file = await ipc.readFile(path);
    editorState.tabs.push({
      path: file.path,
      ext: file.ext,
      content: file.content,
      savedContent: file.content,
      dirty: false
    });
    editorState.activePath = file.path;
  }

  function closeTab(path: string) {
    const idx = editorState.tabs.findIndex((tab) => tab.path === path);
    if (idx < 0) return;
    editorState.tabs.splice(idx, 1);
    if (editorState.activePath === path) {
      editorState.activePath = editorState.tabs[Math.max(0, idx - 1)]?.path ?? null;
    }
  }

  function onEditorChange(content: string) {
    if (!activeTab) return;
    activeTab.content = content;
    activeTab.dirty = content !== activeTab.savedContent;
    if (autosaveTimer) window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => void saveActive(), 800);
  }

  async function saveActive() {
    if (!activeTab) return;
    await saveTab(activeTab);
  }

  async function saveTab(tab: OpenTab) {
    if (!tab.dirty) return;
    await ipc.writeFile(tab.path, tab.content);
    tab.savedContent = tab.content;
    tab.dirty = false;
    statusMessage = `Saved ${tab.path}`;
    await refreshGitStatus();
  }

  async function createFile(dir: string, ext: Ext) {
    const node = await ipc.createFile(dir, newName || "Untitled", ext);
    newName = "Untitled";
    await refreshTree();
    await openFile(node.path);
  }

  async function renameActive() {
    if (!activeTab) return;
    const to = window.prompt("Rename to", activeTab.path);
    if (!to || to === activeTab.path) return;
    await ipc.renameFile(activeTab.path, to);
    activeTab.path = to;
    editorState.activePath = to;
    await refreshTree();
  }

  async function moveActive() {
    if (!activeTab) return;
    const toDir = window.prompt("Move to folder", "quick");
    if (toDir === null) return;
    await ipc.moveFile(activeTab.path, toDir);
    closeTab(activeTab.path);
    await refreshTree();
  }

  async function trashFile(path: string) {
    await ipc.trashFile(path);
    closeTab(path);
    await refreshTree();
    trash = await ipc.listTrash();
  }

  async function restore(trashId: string) {
    await ipc.restoreFile(trashId);
    await refreshTree();
    trash = await ipc.listTrash();
  }

  async function runSearch() {
    searchBusy = true;
    try {
      searchState.hits = searchState.query.trim()
        ? await ipc.search(searchState.query)
        : [];
    } finally {
      searchBusy = false;
    }
  }

  async function refreshGitStatus() {
    if (!vaultState.info || !syncState.gitAvailable) return;
    try {
      syncState.status = await ipc.gitStatus();
      syncState.conflicts = syncState.status.conflicted;
    } catch {
      syncState.status = null;
    }
  }

  async function convertToGit() {
    if (!syncState.remoteInput.trim()) return;
    await ipc.convertVaultToGit(syncState.remoteInput.trim());
    await refreshGitStatus();
    statusMessage = "Git remote connected";
  }

  async function pull() {
    const result = await ipc.gitPull();
    syncState.conflicts = result.conflicts;
    await refreshTree();
    await refreshGitStatus();
    statusMessage = result.conflicts.length ? "Resolve conflicts" : "Pulled latest";
  }

  async function commitPush() {
    await Promise.all(editorState.tabs.filter((tab) => tab.dirty).map(saveTab));
    await ipc.gitCommitPush(syncState.message || "Update notes");
    syncState.message = "";
    await refreshGitStatus();
    statusMessage = "Pushed";
  }

  async function resolveActiveConflict() {
    if (!activeTab) return;
    await ipc.gitResolveConflict(activeTab.path, activeTab.content);
    syncState.conflicts = syncState.conflicts.filter((path) => path !== activeTab.path);
    await refreshGitStatus();
  }

  function setViewMode(mode: ViewMode) {
    editorState.viewMode = mode;
  }

  function format(action: FormatAction) {
    editorRef?.format(action);
  }
</script>

<main class="app">
  <header class="topbar">
    <div class="brand">
      <strong>GitNotes</strong>
      <span>{vaultState.ping}</span>
    </div>
    <div class="vault-picker">
      <input bind:value={openPathInput} placeholder="Vault path" onkeydown={(event) => event.key === "Enter" && openVaultFromInput()} />
      <button onclick={openVaultFromInput}>Open</button>
      <button onclick={pickVault}>Pick</button>
    </div>
    <div class="status">{statusMessage}</div>
  </header>

  <div class="workspace">
    <section class="sidebar">
      <FileTree
        root={vaultState.tree}
        activePath={editorState.activePath}
        onOpen={openFile}
        onCreate={createFile}
        onTrash={trashFile}
        onReveal={(path) => void ipc.revealInFinder(path)}
      />
      <section class="finder">
        <div class="section-title">
          <strong>Search</strong>
          {#if vaultState.indexProgress}
            <span>{vaultState.indexProgress.done}/{vaultState.indexProgress.total}</span>
          {/if}
        </div>
        <input bind:value={searchState.query} placeholder="Search notes" oninput={runSearch} />
        <div class="hits">
          {#if searchBusy}<span>Searching...</span>{/if}
          {#each searchState.hits as hit (hit.path)}
            <button onclick={() => openFile(hit.path)}>
              <strong>{hit.title}</strong>
              <small>{hit.path}</small>
              <em>{@html hit.snippet}</em>
            </button>
          {/each}
        </div>
      </section>
      <section class="trash">
        <div class="section-title"><strong>Trash</strong><span>{trash.length}</span></div>
        {#each trash as item (item.trashId)}
          <button onclick={() => restore(item.trashId)}>{item.originalPath}</button>
        {/each}
      </section>
    </section>

    <section class="main">
      <Toolbar
        ext={activeExt}
        vimMode={editorState.vimMode}
        toolbar={editorState.toolbar}
        viewMode={editorState.viewMode}
        onFormat={format}
        onVimToggle={() => (editorState.vimMode = !editorState.vimMode)}
        onToolbarToggle={() => (editorState.toolbar = !editorState.toolbar)}
        onViewMode={setViewMode}
      />
      <Tabs
        tabs={editorState.tabs}
        activePath={editorState.activePath}
        onSelect={(path) => (editorState.activePath = path)}
        onClose={closeTab}
      />
      <div class="note-actions">
        <input bind:value={newName} aria-label="New note name" />
        <button onclick={() => activeExt && createFile("", activeExt)}>New</button>
        <button disabled={!activeTab} onclick={renameActive}>Rename</button>
        <button disabled={!activeTab} onclick={moveActive}>Move</button>
        <button disabled={!activeTab} onclick={() => activeTab && trashFile(activeTab.path)}>Trash</button>
      </div>
      <ConflictView
        conflicts={syncState.conflicts}
        activeContent={activeTab?.content ?? ""}
        onOpen={openFile}
        onResolve={resolveActiveConflict}
      />

      {#if activeTab}
        <div class:edit-only={editorState.viewMode === "edit"} class:preview-only={editorState.viewMode === "preview"} class="editor-grid">
          {#if editorState.viewMode !== "preview"}
            <NoteEditor
              bind:this={editorRef}
              content={activeTab.content}
              ext={activeTab.ext}
              vimMode={editorState.vimMode}
              onChange={onEditorChange}
              onSave={saveActive}
              onBlur={saveActive}
            />
          {/if}
          {#if editorState.viewMode !== "edit"}
            <PreviewPane path={activeTab.path} ext={activeTab.ext} content={activeTab.content} />
          {/if}
        </div>
      {:else}
        <section class="empty-editor">
          <h1>Open a vault and choose a note</h1>
        </section>
      {/if}
    </section>

    <aside class="sync">
      <div class="section-title"><strong>Git Sync</strong></div>
      {#if syncState.gitAvailable}
        {#if syncState.status}
          <dl>
            <dt>Branch</dt><dd>{syncState.status.branch}</dd>
            <dt>Ahead</dt><dd>{syncState.status.ahead}</dd>
            <dt>Behind</dt><dd>{syncState.status.behind}</dd>
            <dt>Dirty</dt><dd>{syncState.status.dirty ? "yes" : "no"}</dd>
          </dl>
        {:else}
          <input bind:value={syncState.remoteInput} placeholder="Git remote URL" />
          <button onclick={convertToGit}>Convert Vault</button>
        {/if}
        <input bind:value={syncState.message} placeholder="Commit message" />
        <button onclick={pull} disabled={!vaultState.info}>Pull</button>
        <button onclick={commitPush} disabled={!vaultState.info}>Commit + Push</button>
        <button onclick={refreshGitStatus} disabled={!vaultState.info}>Refresh</button>
      {:else}
        <p>Install Git with xcode-select --install.</p>
      {/if}
    </aside>
  </div>

  <Palette
    open={searchState.paletteOpen}
    tree={vaultState.tree}
    onClose={() => (searchState.paletteOpen = false)}
    onOpen={openFile}
  />
</main>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    color: #17201f;
    background: #edf1ef;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  :global(button),
  :global(input) {
    font: inherit;
  }

  .app {
    display: grid;
    grid-template-rows: 48px minmax(0, 1fr);
    width: 100vw;
    height: 100vh;
  }

  .topbar {
    display: grid;
    grid-template-columns: 220px minmax(260px, 1fr) 260px;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    border-bottom: 1px solid #cbd4d1;
    background: #f8faf9;
  }

  .brand {
    display: grid;
    gap: 1px;
  }

  .brand strong {
    font-size: 15px;
  }

  .brand span,
  .status {
    overflow: hidden;
    color: #65706d;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vault-picker {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 72px 72px;
    gap: 6px;
  }

  input {
    min-width: 0;
    height: 30px;
    box-sizing: border-box;
    border: 1px solid #b8c6c2;
    border-radius: 6px;
    padding: 0 9px;
    background: #ffffff;
    color: #17201f;
    outline: none;
  }

  input:focus {
    border-color: #2d7770;
    box-shadow: 0 0 0 2px rgba(45, 119, 112, 0.15);
  }

  button {
    min-height: 30px;
    border: 1px solid #b8c6c2;
    border-radius: 6px;
    background: #ffffff;
    color: #17201f;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    border-color: #2d7770;
    background: #e8f3f1;
  }

  button:disabled {
    cursor: default;
    opacity: 0.55;
  }

  .workspace {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr) 230px;
    min-height: 0;
  }

  .sidebar,
  .sync {
    min-height: 0;
    overflow: hidden;
    background: #f3f6f5;
  }

  .sidebar {
    display: grid;
    grid-template-rows: minmax(220px, 1fr) minmax(130px, 210px) minmax(70px, 150px);
  }

  .main {
    display: grid;
    grid-template-rows: auto auto auto auto minmax(0, 1fr);
    min-width: 0;
    min-height: 0;
    background: #ffffff;
  }

  .sync {
    display: grid;
    align-content: start;
    gap: 8px;
    padding: 10px;
    border-left: 1px solid #cbd4d1;
  }

  .section-title {
    display: flex;
    justify-content: space-between;
    padding: 8px 10px;
    color: #33413f;
    font-size: 12px;
  }

  .finder,
  .trash {
    min-height: 0;
    overflow: auto;
    border-top: 1px solid #cbd4d1;
  }

  .finder input {
    width: calc(100% - 16px);
    margin: 0 8px 8px;
  }

  .hits {
    display: grid;
    gap: 4px;
    padding: 0 8px 8px;
  }

  .hits button {
    display: grid;
    gap: 2px;
    height: auto;
    padding: 8px;
    text-align: left;
  }

  .hits small,
  .hits em {
    overflow: hidden;
    color: #68736f;
    font-size: 11px;
    font-style: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .trash {
    display: grid;
    align-content: start;
    gap: 4px;
    padding-bottom: 8px;
  }

  .trash button {
    margin: 0 8px;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .note-actions {
    display: grid;
    grid-template-columns: minmax(120px, 220px) repeat(4, 78px);
    gap: 6px;
    padding: 6px 10px;
    border-bottom: 1px solid #cbd4d1;
    background: #f8faf9;
  }

  .editor-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    min-height: 0;
  }

  .editor-grid.edit-only,
  .editor-grid.preview-only {
    grid-template-columns: minmax(0, 1fr);
  }

  .empty-editor {
    display: grid;
    place-items: center;
    color: #5f6b67;
  }

  .empty-editor h1 {
    font-size: 18px;
    font-weight: 600;
  }

  dl {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 10px;
    margin: 0;
    font-size: 12px;
  }

  dt {
    color: #65706d;
  }

  dd {
    margin: 0;
  }

  .sync input,
  .sync button {
    width: 100%;
  }

  .sync p {
    color: #8a3328;
    font-size: 12px;
  }

  @media (max-width: 980px) {
    .workspace {
      grid-template-columns: 250px minmax(0, 1fr);
    }

    .sync {
      display: none;
    }

    .topbar {
      grid-template-columns: 160px minmax(180px, 1fr);
    }

    .status {
      display: none;
    }
  }
</style>
