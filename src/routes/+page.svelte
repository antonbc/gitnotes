<script lang="ts">
  import {
    CircleHelp as CircleHelpIcon,
    Save as SaveIcon,
    Search as SearchIcon,
    Type as TypeIcon,
    Zap as ZapIcon,
    ZapOff as ZapOffIcon
  } from "@lucide/svelte";
  import { listen } from "@tauri-apps/api/event";
  import { onDestroy, onMount, untrack } from "svelte";
  import AppearancePopover from "$lib/components/AppearancePopover.svelte";
  import ConflictView from "$lib/components/ConflictView.svelte";
  import FileTree from "$lib/components/FileTree.svelte";
  import OnboardingTutorial from "$lib/components/OnboardingTutorial.svelte";
  import Palette from "$lib/components/Palette.svelte";
  import StatusBar from "$lib/components/StatusBar.svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import Toolbar from "$lib/components/Toolbar.svelte";
  import { tooltip } from "$lib/actions/tooltip";
  import NoteEditor from "$lib/editor/NoteEditor.svelte";
  import { errorMessage } from "$lib/errors";
  import { canCommitPush as canCommitPushNow } from "$lib/git/commit";
  import { ipc } from "$lib/ipc";
  import PreviewPane from "$lib/preview/PreviewPane.svelte";
  import { editorState, type OpenTab } from "$lib/stores/editor.svelte";
  import { searchState } from "$lib/stores/search.svelte";
  import { settings, saveSettings } from "$lib/stores/settings.svelte";
  import { syncState } from "$lib/stores/sync.svelte";
  import { vaultState } from "$lib/stores/vault.svelte";
  import type { EditorMetrics, Ext, FormatAction, PaletteCommand, ViewMode } from "$lib/types";

  let editorRef = $state<any>(null);
  let autosaveTimers = new Map<string, number>();
  let activeSaveCount = 0;
  let appearanceOpen = $state(false);
  let tutorialOpen = $state(false);

  const activeTab = $derived(
    editorState.tabs.find((t) => t.path === editorState.activePath) ?? null
  );
  const activeExt = $derived(activeTab?.ext ?? null);
  const canCommitPush = $derived(
    canCommitPushNow({
      status: syncState.status,
      conflicts: syncState.conflicts,
      dirtyTabCount: editorState.tabs.filter((tab) => tab.dirty).length,
      localChangeCount: editorState.localChanges.size,
    })
  );
  let previewPath = $state<string | null>(null);
  let previewExt = $state<Ext>("md");
  let previewContent = $state("");
  let previewVersion = $state(0);
  let restoringSession = $state(false);

  editorState.viewMode = settings.viewMode;
  editorState.vimMode = settings.vimMode;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  onMount(() => {
    let unlistenVault: (() => void) | null = null;
    let unlistenIndex: (() => void) | null = null;
    let unlistenClose: (() => void) | null = null;
    let tutorialTimer: number | null = null;
    const isTauri = Boolean(
      (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
    );

    if (!settings.onboardingSeen) {
      tutorialTimer = window.setTimeout(() => {
        tutorialOpen = true;
      }, 420);
    }

    void (async () => {
      if (isTauri) {
        vaultState.ping = await ipc.ping();
        syncState.gitAvailable = await ipc.checkGitAvailable();
      } else {
        vaultState.ping = "browser";
        syncState.gitAvailable = false;
      }

      if (isTauri && settings.lastVaultRoot) {
        restoringSession = true;
        try {
          vaultState.info = await ipc.openVault(settings.lastVaultRoot);
          await refreshTree();
          await refreshGitStatus();
          await restoreSessionTabs();
        } catch {
          settings.lastVaultRoot = "";
          settings.openTabs = [];
          settings.activePath = null;
          saveSettings();
        } finally {
          restoringSession = false;
        }
      }

      if (isTauri) {
        unlistenVault = await listen<{ paths: string[] }>("vault_changed", async (event) => {
          await refreshTree();
          // Incrementally index only the changed paths instead of re-walking and
          // re-reading the entire vault on every filesystem event (e.g. our own saves).
          if (event.payload.paths.length > 0) {
            void ipc.indexPaths(event.payload.paths);
          }
          for (const path of event.payload.paths) {
            const tab = editorState.tabs.find((t) => t.path === path);
            if (!tab) continue;
            if (tab.dirty) {
              tab.diskStale = true;
              continue;
            }
            try {
              const fresh = await ipc.readFile(path);
              tab.content = fresh.content;
              tab.savedContent = fresh.content;
              tab.diskStale = false;
              if (editorState.activePath === path) {
                syncPreviewFromTab(tab);
              }
            } catch {
              closeTab(path);
            }
          }
        });

        unlistenIndex = await listen<{ done: number; total: number }>("index_progress", (event) => {
          vaultState.indexProgress = event.payload;
        });

        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        unlistenClose = await getCurrentWindow().onCloseRequested(async (event) => {
          const dirty = editorState.tabs.filter((tab) => tab.dirty);
          if (dirty.length === 0) return;
          event.preventDefault();
          clearAutosaveTimers();
          try {
            await Promise.all(dirty.map(saveTab));
          } catch {
            return;
          }
          await getCurrentWindow().close();
        });
      }
    })();

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void commitPush();
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveActive();
        return;
      }
      if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        searchState.paletteOpen = true;
        return;
      }
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchState.paletteOpen = true;
        return;
      }
      if (mod && (e.key === "/" || e.key === "?")) {
        e.preventDefault();
        openTutorial();
        return;
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (vaultState.info) void createFile("", "md");
        else void pickVault();
        return;
      }
      if (mod && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (editorState.activePath) void closeTab(editorState.activePath);
        return;
      }
      if (mod && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      if (mod && e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        cycleTab(1);
        return;
      }
      if (mod && e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        cycleTab(-1);
        return;
      }
      if (mod && !e.shiftKey && !e.altKey && ["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        editorState.viewMode = e.key === "1" ? "edit" : e.key === "2" ? "split" : "preview";
        return;
      }
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!editorState.tabs.some((t) => t.dirty)) return;
      event.preventDefault();
      event.returnValue = "";
      clearAutosaveTimers();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      unlistenVault?.();
      unlistenIndex?.();
      unlistenClose?.();
      if (tutorialTimer !== null) window.clearTimeout(tutorialTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  });

  onDestroy(() => {
    clearAutosaveTimers();
  });

  $effect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.font = settings.editorFont;
  });

  $effect(() => {
    const viewMode = editorState.viewMode;
    const vimMode = editorState.vimMode;
    if (restoringSession) return;

    untrack(() => {
      if (settings.viewMode !== viewMode || settings.vimMode !== vimMode) {
        settings.viewMode = viewMode;
        settings.vimMode = vimMode;
        saveSettings();
      }
    });
  });

  $effect(() => {
    const root = vaultState.info?.root;
    const openTabs = editorState.tabs.map((tab) => tab.path);
    const activePath = editorState.activePath;

    if (!root || restoringSession) return;

    untrack(() => {
      settings.lastVaultRoot = root;
      settings.openTabs = openTabs;
      settings.activePath = activePath;
      saveSettings();
    });
  });

  // ── Vault ──────────────────────────────────────────────────────────────────

  async function pickVault() {
    if (!(await confirmWorkspaceChange("switch vaults"))) return;
    try {
      const info = await ipc.pickAndOpenVault();
      if (!info) return;
      editorState.tabs = [];
      editorState.activePath = null;
      syncPreviewFromTab(null);
      resetEditorMetrics();
      vaultState.info = info;
      settings.lastVaultRoot = info.root;
      settings.openTabs = [];
      settings.activePath = null;
      saveSettings();
      await refreshTree();
      await refreshGitStatus();
    } catch (err) {
      editorState.saveError = errorMessage(err);
    }
  }

  async function refreshTree() {
    if (!vaultState.info) return;
    vaultState.tree = await ipc.listFiles();
  }

  function syncPreviewFromTab(tab: OpenTab | null) {
    previewPath = tab?.path ?? null;
    previewExt = tab?.ext ?? "md";
    previewContent = tab?.content ?? "";
    previewVersion += 1;
  }

  function updateEditorMetrics(metrics: EditorMetrics) {
    editorState.cursor = metrics.cursor;
    editorState.selection = metrics.selection;
    editorState.lineCount = metrics.lineCount;
    editorState.wordCount = metrics.wordCount;
    editorState.charCount = metrics.charCount;
  }

  function contentMetrics(content: string): EditorMetrics {
    return {
      cursor: { ln: 1, col: 1 },
      selection: { chars: 0, ranges: 0 },
      lineCount: content.length ? content.split(/\r\n|\r|\n/).length : 1,
      wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
      charCount: content.length,
    };
  }

  function applyContentMetrics(content: string) {
    updateEditorMetrics(contentMetrics(content));
  }

  function resetEditorMetrics() {
    updateEditorMetrics({
      cursor: { ln: 1, col: 1 },
      selection: { chars: 0, ranges: 0 },
      lineCount: 0,
      wordCount: 0,
      charCount: 0,
    });
  }

  async function restoreSessionTabs() {
    const remembered = [
      ...new Set([
        ...settings.openTabs,
        ...(settings.activePath ? [settings.activePath] : []),
      ]),
    ];

    for (const path of remembered) {
      try {
        await openFile(path);
      } catch {
        // The note may have been moved or deleted outside GitNotes.
      }
    }

    if (settings.activePath && editorState.tabs.some((tab) => tab.path === settings.activePath)) {
      selectTab(settings.activePath);
      return;
    }

    const current = editorState.tabs.find((t) => t.path === editorState.activePath) ?? null;
    syncPreviewFromTab(current);
    if (current) applyContentMetrics(current.content);
    else resetEditorMetrics();
  }

  async function confirmWorkspaceChange(action: string) {
    const dirtyTabs = editorState.tabs.filter((tab) => tab.dirty);
    if (dirtyTabs.length === 0) return true;

    const label = dirtyTabs.length === 1 ? fileName(dirtyTabs[0].path) : `${dirtyTabs.length} notes`;
    if (window.confirm(`Save unsaved changes in ${label} before you ${action}?`)) {
      await Promise.all(dirtyTabs.map(saveTab));
      return true;
    }

    return window.confirm(`Discard unsaved changes in ${label}?`);
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────

  async function openFile(path: string) {
    const existing = editorState.tabs.find((t) => t.path === path);
    if (existing) {
      editorState.activePath = path;
      syncPreviewFromTab(existing);
      applyContentMetrics(existing.content);
      return;
    }
    const file = await ipc.readFile(path);
    const tab: OpenTab = {
      path: file.path,
      ext: file.ext,
      content: file.content,
      savedContent: file.content,
      dirty: false,
      diskStale: false,
    };
    editorState.tabs.push(tab);
    editorState.activePath = file.path;
    syncPreviewFromTab(tab);
    applyContentMetrics(tab.content);
  }

  function selectTab(path: string) {
    editorState.activePath = path;
    const tab = editorState.tabs.find((t) => t.path === path) ?? null;
    syncPreviewFromTab(tab);
    if (tab) applyContentMetrics(tab.content);
  }

  function cycleTab(delta: number) {
    if (!editorState.tabs.length) return;
    const current = editorState.tabs.findIndex((tab) => tab.path === editorState.activePath);
    const start = current >= 0 ? current : 0;
    const next = (start + delta + editorState.tabs.length) % editorState.tabs.length;
    selectTab(editorState.tabs[next].path);
  }

  async function reloadTabFromDisk(path: string) {
    const tab = editorState.tabs.find((t) => t.path === path);
    if (!tab) return;

    if (tab.dirty && !window.confirm(`Discard unsaved edits and reload ${fileName(path)} from disk?`)) {
      return;
    }

    try {
      const fresh = await ipc.readFile(path);
      tab.content = fresh.content;
      tab.savedContent = fresh.content;
      tab.dirty = false;
      tab.diskStale = false;
      if (editorState.activePath === path) {
        syncPreviewFromTab(tab);
        applyContentMetrics(tab.content);
      }
    } catch (err) {
      editorState.saveError = errorMessage(err);
    }
  }

  async function closeTab(path: string) {
    const idx = editorState.tabs.findIndex((t) => t.path === path);
    if (idx < 0) return;
    const tab = editorState.tabs[idx];
    if (tab.dirty) {
      if (window.confirm(`Save changes to ${fileName(tab.path)} before closing?`)) {
        await saveTab(tab);
      } else if (!window.confirm(`Discard unsaved changes to ${fileName(tab.path)}?`)) {
        return;
      }
    }
    removeTab(path);
  }

  function removeTab(path: string) {
    const idx = editorState.tabs.findIndex((t) => t.path === path);
    if (idx < 0) return;
    clearAutosaveTimer(path);
    editorState.tabs.splice(idx, 1);
    if (editorState.activePath === path) {
      editorState.activePath = editorState.tabs[Math.max(0, idx - 1)]?.path ?? null;
    }
    const next = editorState.tabs.find((t) => t.path === editorState.activePath) ?? null;
    syncPreviewFromTab(next);
    if (next) applyContentMetrics(next.content);
    else resetEditorMetrics();
  }

  // ── Editor ─────────────────────────────────────────────────────────────────

  function updateSavingState() {
    editorState.saving = activeSaveCount > 0 || autosaveTimers.size > 0;
  }

  function clearAutosaveTimer(path: string) {
    const timer = autosaveTimers.get(path);
    if (timer === undefined) return;
    window.clearTimeout(timer);
    autosaveTimers.delete(path);
    updateSavingState();
  }

  function clearAutosaveTimers() {
    for (const timer of autosaveTimers.values()) {
      window.clearTimeout(timer);
    }
    autosaveTimers.clear();
    updateSavingState();
  }

  function queueAutosave(delay = 450, tab = activeTab) {
    if (!tab?.dirty) {
      if (tab) clearAutosaveTimer(tab.path);
      updateSavingState();
      return;
    }

    const path = tab.path;
    clearAutosaveTimer(path);
    const timer = window.setTimeout(async () => {
      autosaveTimers.delete(path);
      updateSavingState();
      try {
        const queuedTab = editorState.tabs.find((candidate) => candidate.path === path);
        if (queuedTab?.dirty) await saveTab(queuedTab);
      } finally {
        updateSavingState();
      }
    }, delay);
    autosaveTimers.set(path, timer);
    updateSavingState();
  }

  function toggleAutosave() {
    settings.autosave = !settings.autosave;
    saveSettings();

    if (settings.autosave) {
      if (activeTab?.dirty) queueAutosave(80);
      return;
    }

    clearAutosaveTimers();
    editorState.saving = false;
  }

  function onEditorChange(content: string) {
    if (!activeTab) return;
    activeTab.content = content;
    activeTab.dirty = content !== activeTab.savedContent;
    editorState.saveError = null;
    previewPath = activeTab.path;
    previewExt = activeTab.ext;
    previewContent = content;
    previewVersion += 1;

    if (settings.autosave) {
      queueAutosave(450, activeTab);
    }
  }

  async function saveActive() {
    if (!activeTab) {
      updateSavingState();
      return;
    }
    clearAutosaveTimer(activeTab.path);
    await saveTab(activeTab);
  }

  async function saveAllTabs() {
    clearAutosaveTimers();
    await Promise.all(editorState.tabs.filter((t) => t.dirty).map(saveTab));
    await refreshGitStatus();
  }

  async function saveTab(tab: OpenTab) {
    if (!tab.dirty) {
      editorState.saveError = null;
      return;
    }

    if (
      tab.diskStale &&
      !window.confirm(
        `${fileName(tab.path)} changed on disk while you were editing. Save your version and overwrite the file on disk?`
      )
    ) {
      return;
    }

    activeSaveCount += 1;
    updateSavingState();
    editorState.saveError = null;
    try {
      await ipc.writeFile(tab.path, tab.content);
      tab.savedContent = tab.content;
      tab.dirty = false;
      tab.diskStale = false;
      editorState.localChanges.add(tab.path);
      editorState.lastSavedAt = Date.now();
      await refreshGitStatus();
    } catch (err) {
      editorState.saveError = errorMessage(err);
      throw err;
    } finally {
      activeSaveCount = Math.max(0, activeSaveCount - 1);
      updateSavingState();
    }
  }

  function format(action: FormatAction) {
    editorRef?.format(action);
  }

  // ── Files ──────────────────────────────────────────────────────────────────

  async function createFile(dir: string, ext: Ext) {
    if (!vaultState.info) return;
    try {
      const node = await ipc.createFile(dir, "Untitled", ext);
      await refreshTree();
      await openFile(node.path);
    } catch (err) {
      editorState.saveError = errorMessage(err);
    }
  }

  async function trashFile(path: string) {
    const tab = editorState.tabs.find((t) => t.path === path);
    if (tab?.dirty && !window.confirm(`Discard unsaved changes and move ${fileName(path)} to Trash?`)) {
      return;
    }
    try {
      await ipc.trashFile(path);
      removeTab(path);
      await refreshTree();
    } catch (err) {
      editorState.saveError = errorMessage(err);
    }
  }

  function fileName(path: string) {
    return path.split("/").at(-1) ?? path;
  }

  function dirName(path: string) {
    const idx = path.lastIndexOf("/");
    return idx >= 0 ? path.slice(0, idx) : "";
  }

  function extFromPath(path: string): Ext {
    return path.endsWith(".typ") ? "typ" : "md";
  }

  function renameTarget(path: string, input: string): { path: string; ext: Ext } | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (trimmed.includes("/") || trimmed.includes("\\")) {
      window.alert("Use a file name only. Move can be added separately.");
      return null;
    }

    const currentExt = extFromPath(path);
    const hasSupportedExt = /\.(md|typ)$/i.test(trimmed);
    const hasAnyExt = /\.[^./\\]+$/.test(trimmed);
    if (hasAnyExt && !hasSupportedExt) {
      window.alert("GitNotes supports only .md and .typ notes.");
      return null;
    }

    const nextName = hasSupportedExt ? trimmed : `${trimmed}.${currentExt}`;
    const nextExt = extFromPath(nextName);
    const dir = dirName(path);
    return {
      path: dir ? `${dir}/${nextName}` : nextName,
      ext: nextExt,
    };
  }

  async function renameFile(path: string) {
    const next = window.prompt("Rename note", fileName(path));
    if (next === null) return;

    const target = renameTarget(path, next);
    if (!target || target.path === path) return;

    const tab = editorState.tabs.find((t) => t.path === path);
    if (tab?.dirty) {
      await saveTab(tab);
    }

    try {
      await ipc.renameFile(path, target.path);

      for (const openTab of editorState.tabs) {
        if (openTab.path === path) {
          openTab.path = target.path;
          openTab.ext = target.ext;
        }
      }

      if (editorState.activePath === path) {
        editorState.activePath = target.path;
      }
      if (editorState.localChanges.has(path)) {
        editorState.localChanges.delete(path);
        editorState.localChanges.add(target.path);
      }
      syncState.conflicts = syncState.conflicts.map((conflict) =>
        conflict === path ? target.path : conflict
      );

      await refreshTree();
      await refreshGitStatus();
      syncPreviewFromTab(editorState.tabs.find((t) => t.path === editorState.activePath) ?? null);
    } catch (err) {
      editorState.saveError = errorMessage(err);
    }
  }

  // ── Git ────────────────────────────────────────────────────────────────────

  async function refreshGitStatus() {
    if (!vaultState.info || !syncState.gitAvailable) return;
    try {
      syncState.status = await ipc.gitStatus();
      syncState.conflicts = syncState.status.conflicted;
      syncState.syncError = null;
    } catch (err) {
      syncState.syncError = errorMessage(err);
    }
  }

  async function convertToGit() {
    if (!syncState.remoteInput.trim()) return;
    try {
      await ipc.convertVaultToGit(syncState.remoteInput.trim());
      syncState.syncError = null;
      await refreshGitStatus();
    } catch (err) {
      syncState.syncError = errorMessage(err);
    }
  }

  async function pull() {
    try {
      await saveAllTabs();
      const result = await ipc.gitPull();
      syncState.conflicts = result.conflicts;
      syncState.syncError = null;
      await refreshTree();
      await refreshGitStatus();
    } catch (err) {
      syncState.syncError = errorMessage(err);
    }
  }

  async function commitPush() {
    try {
      await saveAllTabs();
      await ipc.gitCommitPush(syncState.message || "Update notes");
      syncState.message = "";
      editorState.localChanges = new Set();
      syncState.syncError = null;
      await refreshGitStatus();
    } catch (err) {
      syncState.syncError = errorMessage(err);
    }
  }

  async function resolveActiveConflict() {
    if (!activeTab) return;
    try {
      await ipc.gitResolveConflict(activeTab.path, activeTab.content);
      syncState.conflicts = syncState.conflicts.filter((p) => p !== activeTab.path);
      syncState.syncError = null;
      await refreshGitStatus();
    } catch (err) {
      syncState.syncError = errorMessage(err);
    }
  }

  // ── View ───────────────────────────────────────────────────────────────────

  const VIEW_MODES: { id: ViewMode; label: string; tooltip: string; shortcut: string }[] = [
    { id: "edit",    label: "Edit",    tooltip: "Editor only", shortcut: "⌘1" },
    { id: "split",   label: "Split",   tooltip: "Split editor and preview", shortcut: "⌘2" },
    { id: "preview", label: "Preview", tooltip: "Preview only", shortcut: "⌘3" },
  ];

  function openTutorial() {
    tutorialOpen = true;
  }

  function closeTutorial() {
    tutorialOpen = false;
    settings.onboardingSeen = true;
    saveSettings();
  }

  const paletteCommands = $derived([
    {
      id: "new-md",
      label: "New Markdown note",
      detail: "Create a note in the vault root",
      shortcut: "⌘N",
      disabled: !vaultState.info,
      run: () => createFile("", "md"),
    },
    {
      id: "new-typ",
      label: "New Typst note",
      detail: "Create a Typst note in the vault root",
      disabled: !vaultState.info,
      run: () => createFile("", "typ"),
    },
    {
      id: "save-active",
      label: "Save current note",
      detail: activeTab ? fileName(activeTab.path) : "No active note",
      shortcut: "⌘S",
      disabled: !activeTab,
      run: saveActive,
    },
    {
      id: "save-all",
      label: "Save all open notes",
      detail: `${editorState.tabs.filter((tab) => tab.dirty).length} unsaved`,
      disabled: editorState.tabs.every((tab) => !tab.dirty),
      run: saveAllTabs,
    },
    {
      id: "toggle-autosave",
      label: settings.autosave ? "Turn off autosave" : "Turn on autosave",
      detail: settings.autosave ? "Manual saves only after this" : "Write shortly after every edit",
      run: toggleAutosave,
    },
    {
      id: "close-tab",
      label: "Close current tab",
      detail: activeTab ? fileName(activeTab.path) : "No active note",
      shortcut: "⌘W",
      disabled: !activeTab,
      run: () => {
        if (activeTab) void closeTab(activeTab.path);
      },
    },
    {
      id: "view-edit",
      label: "Editor only",
      detail: "Hide preview",
      shortcut: "⌘1",
      run: () => {
        editorState.viewMode = "edit";
      },
    },
    {
      id: "view-split",
      label: "Split editor and preview",
      detail: "Show source beside rendered note",
      shortcut: "⌘2",
      run: () => {
        editorState.viewMode = "split";
      },
    },
    {
      id: "view-preview",
      label: "Preview only",
      detail: "Hide source editor",
      shortcut: "⌘3",
      run: () => {
        editorState.viewMode = "preview";
      },
    },
    {
      id: "toggle-sidebar",
      label: settings.sidebarOpen ? "Hide sidebar" : "Show sidebar",
      detail: "Toggle the file tree",
      shortcut: "⌘\\",
      run: toggleSidebar,
    },
    {
      id: "show-tutorial",
      label: "Show tutorial and shortcuts",
      detail: "Preview the main GitNotes workflow",
      shortcut: "⌘/",
      run: openTutorial,
    },
    {
      id: "toggle-vim",
      label: editorState.vimMode ? "Disable Vim mode" : "Enable Vim mode",
      detail: "Switch editor keybindings",
      run: () => {
        editorState.vimMode = !editorState.vimMode;
      },
    },
    {
      id: "pull",
      label: "Pull from remote",
      detail: "Save open notes, then fetch and merge",
      disabled: !syncState.status,
      run: pull,
    },
    {
      id: "commit-push",
      label: "Commit and push",
      detail: syncState.message || "Update notes",
      shortcut: "⇧⌘S",
      disabled: !canCommitPush,
      run: commitPush,
    },
    {
      id: "open-vault",
      label: vaultState.info ? "Switch vault" : "Open vault",
      detail: vaultState.info?.root ?? "Choose a notes folder",
      run: pickVault,
    },
  ] satisfies PaletteCommand[]);

  function toggleSidebar() {
    settings.sidebarOpen = !settings.sidebarOpen;
    saveSettings();
  }
</script>

<div
  class="app"
  data-theme={settings.theme}
  data-font={settings.editorFont}
>
  <!-- ── Titlebar ──────────────────────────────────────────────────────────── -->
  <header class="titlebar">
    <!-- macOS traffic lights (decorative) -->
    <div class="traffic-lights">
      <span class="tl tl-r"></span>
      <span class="tl tl-y"></span>
      <span class="tl tl-g"></span>
    </div>

    <!-- Sidebar toggle -->
    <button
      class="tb-btn"
      aria-label={settings.sidebarOpen ? "Hide sidebar" : "Show sidebar"}
      use:tooltip={{ label: settings.sidebarOpen ? "Hide sidebar" : "Show sidebar", shortcut: "⌘\\", placement: "bottom" }}
      onclick={toggleSidebar}
    >
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 3v14" stroke="currentColor" stroke-width="1.5"/>
      </svg>
    </button>

    <!-- Vault name / open button -->
    {#if vaultState.info}
      <div class="tb-vault" title={vaultState.info.root}>
        <span class="vault-dot"></span>
        {vaultState.info.root.split("/").at(-1)}
        <button
          class="chip-switch"
          aria-label="Switch vault"
          use:tooltip={{ label: "Switch vault", placement: "bottom" }}
          onclick={pickVault}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M6 2l3 3M6 2L3 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 10l3-3M6 10L3 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    {:else}
      <button
        class="btn-open"
        use:tooltip={{ label: "Open vault", shortcut: "⌘N", placement: "bottom" }}
        onclick={pickVault}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M2 6h12v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6zM1 4l1-1h4l1 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Open vault
      </button>
    {/if}

    <div class="tb-spacer"></div>

    <!-- View-mode segmented control -->
    <div class="view-seg" role="group" aria-label="View mode">
      {#each VIEW_MODES as { id, label, tooltip: tip, shortcut }}
        <button
          class="seg-btn"
          class:active={editorState.viewMode === id}
          aria-label={tip}
          use:tooltip={{ label: tip, shortcut, placement: "bottom" }}
          onclick={() => (editorState.viewMode = id)}
        >{label}</button>
      {/each}
    </div>

    {#if activeTab}
      <div class="save-strip" aria-label="Save controls">
        <button
          class="save-now-btn"
          class:dirty={activeTab.dirty}
          aria-label="Save current note"
          use:tooltip={{ label: activeTab.dirty ? "Save current note" : "Current note is saved", shortcut: "⌘S", placement: "bottom" }}
          disabled={editorState.saving || !activeTab.dirty}
          onclick={() => void saveActive()}
        >
          <SaveIcon class="save-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>{editorState.saving ? "Saving" : activeTab.dirty ? "Save" : "Saved"}</span>
          <kbd>⌘S</kbd>
        </button>

        <button
          class="autosave-now-btn"
          class:active={settings.autosave}
          aria-label={settings.autosave ? "Turn off autosave" : "Turn on autosave"}
          use:tooltip={{ label: settings.autosave ? "Turn off autosave" : "Turn on autosave", placement: "bottom" }}
          onclick={toggleAutosave}
        >
          {#if settings.autosave}
            <ZapIcon class="save-icon" size={14} strokeWidth={1.9} aria-hidden="true" />
          {:else}
            <ZapOffIcon class="save-icon" size={14} strokeWidth={1.9} aria-hidden="true" />
          {/if}
          <span>Auto</span>
        </button>
      </div>
    {/if}

    <div class="utility-strip" aria-label="Appearance and search">
      <button
        class="utility-btn help-trigger"
        aria-label="Show tutorial and shortcuts"
        use:tooltip={{ label: "Show tutorial and shortcuts", shortcut: "⌘/", placement: "bottom" }}
        onclick={openTutorial}
      >
        <CircleHelpIcon class="utility-icon" size={15} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <!-- Appearance popover anchor -->
      <div class="popover-anchor">
        <button
          class="utility-btn appearance-trigger"
          class:active={appearanceOpen}
          aria-label="Appearance"
          use:tooltip={{ label: "Appearance", placement: "bottom" }}
          onclick={() => (appearanceOpen = !appearanceOpen)}
        >
          <span class="aa-mark">Aa</span>
        </button>
        {#if appearanceOpen}
          <AppearancePopover onClose={() => (appearanceOpen = false)} />
        {/if}
      </div>

      <!-- Search button -->
      <button
        class="utility-btn search-trigger"
        aria-label="Search / Command palette"
        use:tooltip={{ label: "Search and commands", shortcut: "⌘K / ⌘P", placement: "bottom" }}
        onclick={() => (searchState.paletteOpen = true)}
      >
        <SearchIcon class="utility-icon" size={15} strokeWidth={1.8} aria-hidden="true" />
        <kbd>⌘K</kbd>
      </button>
    </div>
  </header>

  <!-- ── Workspace ─────────────────────────────────────────────────────────── -->
  <div class="workspace">
    <!-- Sidebar -->
    <aside class="sidebar" class:open={settings.sidebarOpen}>
      <FileTree
        root={vaultState.tree}
        activePath={editorState.activePath}
        onOpen={openFile}
        onCreate={createFile}
        onRename={renameFile}
        onTrash={trashFile}
        onReveal={(p) => void ipc.revealInFinder(p)}
        onSearchClick={() => (searchState.paletteOpen = true)}
      />
    </aside>

    <!-- Main editor area -->
    <main class="main">
      <!-- Tabs -->
      <Tabs
        tabs={editorState.tabs}
        activePath={editorState.activePath}
        onSelect={selectTab}
        onClose={(path) => void closeTab(path)}
        onRename={renameFile}
        onReload={(path) => void reloadTabFromDisk(path)}
        canCreate={Boolean(vaultState.info)}
        onNew={() => void createFile("", "md")}
      />

      <!-- Format toolbar (only when editing) -->
      {#if editorState.viewMode !== "preview" && activeTab}
        <Toolbar
          ext={activeExt}
          vimMode={editorState.vimMode}
          onFormat={format}
          onVimToggle={() => (editorState.vimMode = !editorState.vimMode)}
        />
      {/if}

      <!-- Conflict banner -->
      <ConflictView
        conflicts={syncState.conflicts}
        activeContent={activeTab?.content ?? ""}
        onOpen={openFile}
        onResolve={resolveActiveConflict}
      />

      <!-- Editor / Preview -->
      {#if activeTab}
        <div
          class="editor-area"
          class:edit-only={editorState.viewMode === "edit"}
          class:preview-only={editorState.viewMode === "preview"}
        >
          {#if editorState.viewMode !== "preview"}
            <NoteEditor
              bind:this={editorRef}
              content={activeTab.content}
              ext={activeTab.ext}
              vimMode={editorState.vimMode}
              onChange={onEditorChange}
              onMetrics={updateEditorMetrics}
              onSave={saveActive}
              onBlur={saveActive}
            />
          {/if}
          {#if editorState.viewMode !== "edit" && previewPath}
            <PreviewPane
              path={previewPath}
              ext={previewExt}
              content={previewContent}
              version={previewVersion}
            />
          {/if}
        </div>
      {:else}
        <div class="empty-state">
          <div class="empty-inner">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="6" y="6" width="28" height="28" rx="6" stroke="currentColor" stroke-width="1.8"/>
              <path d="M13 14h14M13 20h10M13 26h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            {#if vaultState.info}
              <p>Select a note</p>
              <p class="hint">⌘N to create · ⌘P to search</p>
            {:else}
              <p>Open a vault to begin</p>
              <button
                class="btn-open-lg"
                use:tooltip={{ label: "Open vault", shortcut: "⌘N", placement: "top" }}
                onclick={pickVault}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 6h12v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6zM1 4l1-1h4l1 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Open vault
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </main>
  </div>

  <!-- ── Status bar ─────────────────────────────────────────────────────────── -->
  <StatusBar
    onPull={pull}
    onCommitPush={commitPush}
    onSaveDisk={saveAllTabs}
    onRefreshGit={refreshGitStatus}
    onConvertVault={convertToGit}
    onAutosaveToggle={toggleAutosave}
  />

  <!-- ── First-run tutorial / shortcuts ────────────────────────────────────── -->
  <OnboardingTutorial
    open={tutorialOpen}
    hasVault={Boolean(vaultState.info)}
    onClose={closeTutorial}
    onOpenVault={pickVault}
    onSearch={() => (searchState.paletteOpen = true)}
  />

  <!-- ── Palette ────────────────────────────────────────────────────────────── -->
  <Palette
    open={searchState.paletteOpen}
    tree={vaultState.tree}
    commands={paletteCommands}
    onClose={() => (searchState.paletteOpen = false)}
    onOpen={openFile}
  />
</div>

<style>
  /* ── Shell ── */
  .app {
    display: grid;
    grid-template-rows: 46px minmax(0, 1fr) 26px;
    width: 100vw;
    height: 100vh;
    background: var(--win-bg);
    color: var(--fg);
    font-family: var(--font-ui);
    overflow: hidden;
  }

  /* ── Titlebar ── */
  .titlebar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    background: var(--chrome-grad);
    border-bottom: 0.5px solid var(--line-strong);
    -webkit-app-region: drag;
    flex-shrink: 0;
    position: relative;
    z-index: 10;
    user-select: none;
  }

  .titlebar > * {
    -webkit-app-region: no-drag;
  }

  /* macOS traffic lights */
  .traffic-lights {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-right: 4px;
    flex-shrink: 0;
  }

  .tl {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: block;
  }
  .tl-r { background: #ff5f57; }
  .tl-y { background: #febc2e; }
  .tl-g { background: #28c840; }

  /* Titlebar buttons */
  .tb-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 28px;
    min-width: 28px;
    padding: 0 8px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--fg-2);
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1;
    font-family: var(--font-ui);
    box-sizing: border-box;
    cursor: pointer;
    transition: background var(--transition), color var(--transition);
    flex-shrink: 0;
  }
  .tb-btn svg { display: block; flex-shrink: 0; }
  .tb-btn:hover { background: var(--hover); color: var(--fg); }
  .tb-btn:active { background: var(--press); }

  .tb-spacer { flex: 1; }

  /* Vault name (green sync dot + name) */
  .tb-vault {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 600;
    color: var(--fg);
    padding: 0 2px 0 6px;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .vault-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ok);
    flex-shrink: 0;
  }

  .chip-switch {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--fg-3);
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: background var(--transition), color var(--transition);
  }
  .chip-switch:hover { background: var(--hover); color: var(--fg); }

  .btn-open {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 28px;
    padding: 0 12px;
    border: none;
    border-radius: 7px;
    background: var(--accent);
    color: #fff;
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1;
    font-family: var(--font-ui);
    box-sizing: border-box;
    cursor: pointer;
    transition: filter var(--transition);
  }
  .btn-open svg { display: block; flex-shrink: 0; }
  .btn-open:hover { filter: brightness(1.06); }

  /* View segmented control */
  .view-seg {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    background: var(--hover);
    border-radius: 8px;
    border: 0.5px solid var(--line-2);
  }

  .seg-btn {
    height: 24px;
    padding: 0 9px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--fg-2);
    font-size: 12px;
    font-weight: 550;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: background var(--transition), color var(--transition);
  }
  .seg-btn:hover { color: var(--fg); }
  .seg-btn.active {
    background: var(--win-bg);
    color: var(--fg);
    box-shadow: 0 0.5px 2px rgba(0,0,0,0.18);
  }

  .save-strip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    height: 30px;
    padding: 2px;
    border: 0.5px solid var(--line-2);
    border-radius: 8px;
    background: var(--hover);
    flex-shrink: 0;
  }

  .save-now-btn,
  .autosave-now-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 24px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--fg-2);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    transition: background var(--transition), color var(--transition), opacity var(--transition);
  }

  .save-now-btn {
    min-width: 86px;
    padding: 0 7px;
  }

  .save-now-btn.dirty {
    background: var(--accent);
    color: #fff;
  }

  .save-now-btn:disabled {
    cursor: default;
    opacity: 0.72;
  }

  .save-now-btn:not(:disabled):hover,
  .autosave-now-btn:hover {
    background: var(--press);
    color: var(--fg);
  }

  .save-now-btn.dirty:not(:disabled):hover {
    filter: brightness(1.06);
  }

  .save-now-btn kbd {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: currentColor;
    opacity: 0.75;
  }

  .autosave-now-btn {
    min-width: 68px;
    padding: 0 8px;
  }

  .autosave-now-btn.active {
    color: var(--ok);
    background: color-mix(in srgb, var(--ok) 14%, transparent);
  }

  :global(.save-icon) {
    display: block;
    flex-shrink: 0;
  }

  /* Appearance popover anchor */
  .popover-anchor {
    position: relative;
  }

  .utility-strip {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    height: 20px;
    width:fit-content;
    overflow: visible;
    flex-shrink: 0;
  }

  .utility-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    height:min-content;
    color: var(--fg-2);
    font-family: var(--font-ui);
    cursor: pointer;
    transition: background var(--transition), color var(--transition);
  }
  .utility-btn:hover,
  .utility-btn.active {
    background: var(--press);
    color: var(--fg);
    border-radius: 5px;
    margin: 10px;
  }

  .help-trigger {
    width: 42px;
  }

  .appearance-trigger {
    gap: 14px;
    padding: 0 16px 0 15px;
  }

  :global(.utility-icon) {
    display: block;
    flex-shrink: 0;
  }

  .aa-mark {
    font-size: 15px;
    font-weight: 700;
    color: currentColor;
  }

  .search-trigger {
    gap: 12px;
    padding: 0 11px 0 14px;
  }

  .search-trigger kbd {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--fg-3);
  }

  /* ── Workspace ── */
  .workspace {
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .sidebar {
    width: 0;
    overflow: hidden;
    flex-shrink: 0;
    transition: width .18s cubic-bezier(.4,0,.2,1);
    border-right: 0px solid var(--border);
  }

  .sidebar.open {
    width: 256px;
    border-right-width: 1px;
  }

  /* ── Main area ── */
  .main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
    background: var(--bg-editor);
    overflow: hidden;
  }

  /* ── Editor area ── */
  .editor-area {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    flex: 1;
    min-height: 0;
  }

  .editor-area.edit-only,
  .editor-area.preview-only {
    grid-template-columns: minmax(0, 1fr);
  }

  /* ── Empty state ── */
  .empty-state {
    display: grid;
    place-items: center;
    flex: 1;
    color: var(--text-faint);
  }

  .empty-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
  }

  .empty-inner p {
    margin: 0;
    font-size: 15px;
    color: var(--text-faint);
  }

  .hint {
    font-size: 12px !important;
    color: var(--text-faint) !important;
  }

  .btn-open-lg {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 16px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    font-size: 13.5px;
    font-weight: 500;
    font-family: var(--font-ui);
    cursor: pointer;
    margin-top: 4px;
    transition: background var(--transition);
  }
  .btn-open-lg:hover { background: var(--accent-hover); }
</style>
