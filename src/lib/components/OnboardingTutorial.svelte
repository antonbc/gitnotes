<script lang="ts">
  import {
    CheckCircle2,
    Command,
    FolderOpen,
    GitBranch,
    Search,
    SplitSquareHorizontal,
    X,
  } from "@lucide/svelte";
  import { tooltip } from "$lib/actions/tooltip";

  let {
    open,
    hasVault,
    onClose,
    onOpenVault,
    onSearch,
  }: {
    open: boolean;
    hasVault: boolean;
    onClose: () => void;
    onOpenVault: () => void | Promise<void>;
    onSearch: () => void;
  } = $props();

  let dialogEl = $state<HTMLElement | null>(null);

  const btnBase =
    "h-8 inline-flex items-center justify-center gap-[7px] rounded-[7px] text-[12.5px] font-[650] leading-none";

  const shortcuts = [
    { keys: "⌘K / ⌘P", label: "Search notes and commands" },
    { keys: "⌘N", label: "Create a Markdown note" },
    { keys: "⌘S", label: "Save the current note" },
    { keys: "⇧⌘S", label: "Commit and push" },
    { keys: "⌘1", label: "Editor only" },
    { keys: "⌘2", label: "Split view" },
    { keys: "⌘3", label: "Preview only" },
    { keys: "⌘\\", label: "Show or hide sidebar" },
  ];

  $effect(() => {
    if (!open) return;
    window.setTimeout(() => dialogEl?.focus(), 0);
  });

  function close() {
    onClose();
  }

  function openVault() {
    close();
    void onOpenVault();
  }

  function openSearch() {
    close();
    onSearch();
  }

  function onBackdropKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") close();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-[60] grid place-items-center p-6 bg-black/[0.34] backdrop-blur-[5px] animate-[fade_0.12s_ease] max-[760px]:p-3 max-[760px]:place-items-stretch"
    role="button"
    tabindex="-1"
    onclick={close}
    onkeydown={onBackdropKeydown}
  >
    <div
      bind:this={dialogEl}
      class="w-[min(920px,calc(100vw-32px))] max-h-[min(720px,calc(100vh-32px))] flex flex-col overflow-hidden border border-border rounded-xl bg-bg-elevated text-text shadow-[var(--shadow-lg)] animate-[pop_0.16s_ease] max-[760px]:w-full max-[760px]:max-h-[calc(100vh-24px)] max-[760px]:my-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      tabindex="-1"
      onclick={(event) => event.stopPropagation()}
      onkeydown={(event) => event.stopPropagation()}
    >
      <header class="flex items-start justify-between gap-[18px] px-6 pt-[22px] pb-4 border-b border-border-sub max-[760px]:px-4">
        <div>
          <p class="mb-1.5 text-accent text-[11px] font-[750] tracking-[0.08em] uppercase">Welcome to GitNotes</p>
          <h2 id="tutorial-title" class="text-[23px] leading-[1.18]">A quick map before you start writing.</h2>
        </div>
        <button
          class="w-[30px] h-[30px] grid place-items-center border-0 rounded-[7px] bg-transparent text-text-muted hover:bg-bg-hover hover:text-text"
          aria-label="Close tutorial"
          use:tooltip={{ label: "Close tutorial", shortcut: "Esc", placement: "left" }}
          onclick={close}
        >
          <X size={16} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </header>

      <div class="grid grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)] gap-[18px] px-6 pt-5 pb-4 overflow-y-auto max-[760px]:px-4 max-[760px]:grid-cols-1">
        <div class="min-h-[312px] overflow-hidden border border-border rounded-lg bg-bg-editor shadow-[var(--shadow-sm)] max-[760px]:min-h-[260px]" aria-label="GitNotes interface preview">
          <div class="h-[38px] flex items-center gap-1.5 px-3 border-b border-border-sub bg-[var(--bg-toolbar)]">
            <span class="w-2.5 h-2.5 rounded-full bg-text-faint opacity-45"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-text-faint opacity-45"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-text-faint opacity-45"></span>
            <div class="flex ml-auto gap-0.5 p-0.5 border border-border-sub rounded-[7px] text-text-faint text-[10px]">
              <span class="px-[7px] py-1 rounded-[5px] font-[650]">Edit</span>
              <strong class="px-[7px] py-1 rounded-[5px] font-[650] bg-bg-elevated text-text">Split</strong>
              <span class="px-[7px] py-1 rounded-[5px] font-[650]">Preview</span>
            </div>
          </div>
          <div class="grid grid-cols-[154px_1fr] min-h-[274px] max-[760px]:grid-cols-[118px_1fr]">
            <aside class="p-[9px] border-r border-border-sub bg-bg-sidebar">
              <div class="h-[26px] flex items-center gap-1.5 mb-[9px] px-2 border border-border rounded-md text-text-faint text-[11px]"><Search size={11} aria-hidden="true" /> Search notes</div>
              <div class="w-full h-[27px] flex items-center mb-[3px] px-2 rounded-md bg-accent text-white text-[12px] text-left">daily/standup.md</div>
              <div class="w-full h-[27px] flex items-center mb-[3px] px-2 rounded-md bg-transparent text-text-muted text-[12px] text-left">research.typ</div>
              <div class="w-full h-[27px] flex items-center mb-[3px] px-2 rounded-md bg-transparent text-text-muted text-[12px] text-left">ideas/launch.md</div>
            </aside>
            <main class="min-w-0 grid grid-rows-[34px_1fr] grid-cols-2 max-[760px]:grid-cols-1">
              <div class="col-span-2 flex items-center gap-[5px] px-2.5 border-b border-border-sub text-text-muted max-[760px]:col-span-1">
                <span class="min-w-[22px] h-[22px] grid place-items-center rounded-[5px] bg-bg-hover text-[10px] font-bold">B</span>
                <span class="min-w-[22px] h-[22px] grid place-items-center rounded-[5px] bg-bg-hover text-[10px] font-bold">I</span>
                <span class="min-w-[22px] h-[22px] grid place-items-center rounded-[5px] bg-bg-hover text-[10px] font-bold">H1</span>
                <span class="min-w-[22px] h-[22px] grid place-items-center rounded-[5px] bg-bg-hover text-[10px] font-bold">[]</span>
              </div>
              <div class="flex flex-col gap-[11px] p-[18px] text-[12px] leading-[1.45] border-r border-border-sub text-text-muted font-[family-name:var(--font-mono)] max-[760px]:border-r-0">
                <strong class="text-[var(--syn-head)]"># Standup</strong>
                <span>- Ship onboarding polish</span>
                <span>- Commit notes to Git</span>
              </div>
              <div class="flex flex-col gap-[11px] p-[18px] text-[12px] leading-[1.45] text-text-muted font-[family-name:var(--font-editor)] max-[760px]:hidden">
                <strong class="text-text text-[18px]">Standup</strong>
                <span>Ship onboarding polish</span>
                <span>Commit notes to Git</span>
              </div>
            </main>
          </div>
        </div>

        <div class="flex flex-col gap-2.5">
          <article class="grid grid-cols-[30px_1fr] gap-2.5 p-[13px] border border-border-sub rounded-lg bg-[color-mix(in_srgb,var(--bg-hover)_70%,transparent)]">
            <FolderOpen class="text-accent" size={18} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <h3 class="text-[13px] leading-[1.25]">Open a vault</h3>
              <p class="text-text-muted text-[12.5px] leading-[1.45] mt-1">Pick a folder of Markdown or Typst files. GitNotes keeps the notes as plain files on disk.</p>
            </div>
          </article>
          <article class="grid grid-cols-[30px_1fr] gap-2.5 p-[13px] border border-border-sub rounded-lg bg-[color-mix(in_srgb,var(--bg-hover)_70%,transparent)]">
            <SplitSquareHorizontal class="text-accent" size={18} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <h3 class="text-[13px] leading-[1.25]">Write with preview</h3>
              <p class="text-text-muted text-[12.5px] leading-[1.45] mt-1">Use the editor, split view, or preview buttons to move between source and rendered notes.</p>
            </div>
          </article>
          <article class="grid grid-cols-[30px_1fr] gap-2.5 p-[13px] border border-border-sub rounded-lg bg-[color-mix(in_srgb,var(--bg-hover)_70%,transparent)]">
            <GitBranch class="text-accent" size={18} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <h3 class="text-[13px] leading-[1.25]">Save and sync</h3>
              <p class="text-text-muted text-[12.5px] leading-[1.45] mt-1">Autosave writes locally, while the status bar handles Git pull, commit, and push when a remote is connected.</p>
            </div>
          </article>
        </div>
      </div>

      <div class="mx-6 mb-[18px] p-3.5 border border-border-sub rounded-lg bg-bg-hover max-[760px]:mx-4">
        <div class="flex items-center gap-[7px] mb-2.5 text-text text-[12px] font-[750]">
          <Command size={15} strokeWidth={1.9} aria-hidden="true" />
          Keyboard shortcuts
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-[7px] max-[760px]:grid-cols-1">
          {#each shortcuts as shortcut}
            <div class="flex items-center justify-between gap-2.5 text-text-muted text-[12px]">
              <kbd class="shrink-0 min-w-[54px] px-1.5 py-0.5 border border-border rounded-[5px] bg-bg-elevated text-text font-[family-name:var(--font-mono)] text-[10px] text-center">{shortcut.keys}</kbd>
              <span>{shortcut.label}</span>
            </div>
          {/each}
        </div>
      </div>

      <footer class="flex justify-between gap-3 px-6 pt-3.5 pb-5 border-t border-border-sub max-[760px]:px-4 max-[760px]:flex-col">
        <button
          class="{btnBase} border border-border bg-transparent text-text-muted px-3 hover:bg-bg-hover hover:text-text"
          type="button"
          use:tooltip={{ label: "Open command palette", shortcut: "⌘K", placement: "top" }}
          onclick={openSearch}
        >
          <Search size={15} strokeWidth={1.9} aria-hidden="true" />
          Command palette
        </button>
        <div class="flex gap-2 max-[760px]:justify-end">
          <button
            class="{btnBase} border border-border bg-transparent text-text-muted px-[11px] hover:bg-bg-hover hover:text-text"
            type="button"
            use:tooltip={{ label: "Skip tutorial", placement: "top" }}
            onclick={close}
          >Skip</button>
          {#if hasVault}
            <button
              class="{btnBase} border-0 px-[13px] bg-accent text-white hover:brightness-[1.06]"
              type="button"
              use:tooltip={{ label: "Close tutorial", placement: "top" }}
              onclick={close}
            >
              <CheckCircle2 size={15} strokeWidth={1.9} aria-hidden="true" />
              Start writing
            </button>
          {:else}
            <button
              class="{btnBase} border-0 px-[13px] bg-accent text-white hover:brightness-[1.06]"
              type="button"
              use:tooltip={{ label: "Choose a notes folder", shortcut: "⌘N", placement: "top" }}
              onclick={openVault}
            >
              <FolderOpen size={15} strokeWidth={1.9} aria-hidden="true" />
              Open vault
            </button>
          {/if}
        </div>
      </footer>
    </div>
  </div>
{/if}
