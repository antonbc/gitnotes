<script lang="ts">
  import Fuse from "fuse.js";
  import { parseSnippet, type SnippetSegment } from "$lib/search/snippet";
  import type { FileNode, PaletteCommand, SearchHit } from "$lib/types";

  type PaletteEntry =
    | {
        kind: "command";
        id: string;
        label: string;
        detail?: string;
        shortcut?: string;
        disabled?: boolean;
        run: () => void | Promise<void>;
      }
    | {
        kind: "file";
        id: string;
        name: string;
        path: string;
        ext: "md" | "typ";
      }
    | {
        kind: "hit";
        id: string;
        title: string;
        path: string;
        snippet: SnippetSegment[];
      };
  type CommandEntry = Extract<PaletteEntry, { kind: "command" }>;
  type FileEntry = Extract<PaletteEntry, { kind: "file" }>;

  let {
    open,
    tree,
    commands = [],
    onClose,
    onOpen,
    onSearchNotes = null,
  }: {
    open: boolean;
    tree: FileNode | null;
    commands?: PaletteCommand[];
    onClose: () => void;
    onOpen: (path: string) => void | Promise<void>;
    /** Full-text vault search (FTS5). Null when unavailable (browser, no vault). */
    onSearchNotes?: ((query: string) => Promise<SearchHit[]>) | null;
  } = $props();

  let query = $state("");
  let inputEl = $state<HTMLInputElement | null>(null);
  let activeIdx = $state(0);
  let contentHits = $state<SearchHit[]>([]);
  let searchToken = 0;

  const files = $derived(flatten(tree));
  const results = $derived(buildResults(query, files, commands, contentHits));

  // Debounced full-text search over note content.
  $effect(() => {
    const trimmed = query.trim();
    const token = ++searchToken;

    if (!open || !onSearchNotes || trimmed.startsWith(">") || trimmed.length < 2) {
      contentHits = [];
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const hits = await onSearchNotes(trimmed);
        if (token === searchToken) contentHits = hits;
      } catch {
        if (token === searchToken) contentHits = [];
      }
    }, 140);

    return () => window.clearTimeout(handle);
  });

  $effect(() => {
    if (open) {
      query = "";
      activeIdx = 0;
      window.setTimeout(() => inputEl?.focus(), 0);
    }
  });

  $effect(() => {
    query;
    results.length;
    activeIdx = 0;
  });

  const activeEntry = $derived(results[activeIdx]);

  function isDisabledCommand(entry: PaletteEntry | undefined) {
    return entry?.kind === "command" && entry.disabled;
  }

  $effect(() => {
    const firstEnabled = results.findIndex((entry) => !isDisabledCommand(entry));
    if (firstEnabled >= 0 && isDisabledCommand(results[activeIdx])) {
      activeIdx = firstEnabled;
    }
  });

  function choose(entry: PaletteEntry) {
    if (isDisabledCommand(entry)) return;
    onClose();
    if (entry.kind === "file" || entry.kind === "hit") {
      void onOpen(entry.path);
      return;
    }
    void entry.run();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); moveActive(1); }
    if (e.key === "ArrowUp")   { e.preventDefault(); moveActive(-1); }
    if (e.key === "Enter" && activeEntry) choose(activeEntry);
  }

  function moveActive(delta: number) {
    if (!results.length) {
      activeIdx = 0;
      return;
    }

    for (let step = 1; step <= results.length; step += 1) {
      const idx = (activeIdx + delta * step + results.length) % results.length;
      const entry = results[idx];
      if (!(entry.kind === "command" && entry.disabled)) {
        activeIdx = idx;
        return;
      }
    }
  }

  function buildResults(
    q: string,
    fileNodes: FileNode[],
    commandItems: PaletteCommand[],
    hits: SearchHit[]
  ): PaletteEntry[] {
    const commandEntries: CommandEntry[] = commandItems.map((command) => ({
      kind: "command",
      id: `command:${command.id}`,
      label: command.label,
      detail: command.detail,
      shortcut: command.shortcut,
      disabled: command.disabled,
      run: command.run,
    }));
    const sortedCommands = [
      ...commandEntries.filter((entry) => !entry.disabled),
      ...commandEntries.filter((entry) => entry.disabled),
    ];
    const fileEntries: FileEntry[] = fileNodes.map((file) => ({
      kind: "file",
      id: `file:${file.path}`,
      name: file.name,
      path: file.path,
      ext: file.ext ?? "md",
    }));
    const trimmed = q.trim();
    const commandOnly = trimmed.startsWith(">");
    const needle = commandOnly ? trimmed.slice(1).trim() : trimmed;
    const entries = commandOnly ? sortedCommands : [...sortedCommands, ...fileEntries];

    if (!needle) return [...sortedCommands.slice(0, 8), ...fileEntries.slice(0, 12)];

    const fuzzy = new Fuse(entries, {
      keys: ["label", "detail", "shortcut", "name", "path"],
      threshold: 0.36,
      ignoreLocation: true,
    })
      .search(needle)
      .map((hit) => hit.item)
      .slice(0, 20);

    if (commandOnly) return fuzzy;

    // Full-text content matches, excluding notes already listed by name.
    const shown = new Set(
      fuzzy.filter((entry) => entry.kind === "file").map((entry) => entry.path)
    );
    const hitEntries: PaletteEntry[] = hits
      .filter((hit) => !shown.has(hit.path))
      .slice(0, 10)
      .map((hit) => ({
        kind: "hit",
        id: `hit:${hit.path}`,
        title: hit.title || hit.path.split("/").at(-1) || hit.path,
        path: hit.path,
        snippet: parseSnippet(hit.snippet),
      }));

    return [...fuzzy, ...hitEntries];
  }

  function flatten(root: FileNode | null): FileNode[] {
    if (!root) return [];
    const out: FileNode[] = [];
    const walk = (n: FileNode) => {
      if (n.ext) out.push(n);
      for (const c of n.children ?? []) walk(c);
    };
    walk(root);
    return out;
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
      class="w-full max-w-[600px] overflow-hidden"
      style="
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
      "
      role="dialog"
      aria-modal="true"
      aria-label="Quick open"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <!-- Search input -->
      <div class="flex items-center gap-2 border-b px-4" style="border-color:var(--border)">
        <svg width="14" height="14" viewBox="0 0 16 16" class="shrink-0" style="color:var(--text-faint)">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input
          bind:this={inputEl}
          bind:value={query}
          placeholder="Search files and commands…"
          class="h-11 flex-1 bg-transparent text-[14px] outline-none"
          style="color:var(--text)"
          onkeydown={handleKey}
        />
        <kbd class="rounded px-1.5 py-0.5 text-[10px]" style="background:var(--bg-hover); color:var(--text-faint)">ESC</kbd>
      </div>

      <!-- Results -->
      <div class="max-h-[380px] overflow-y-auto py-1">
        {#each results as entry, i (entry.id)}
          {#if entry.kind === "hit" && results[i - 1]?.kind !== "hit"}
            <p class="px-4 pb-1 pt-2 text-[10.5px] font-bold tracking-[0.05em] uppercase" style="color:var(--text-faint)">
              Content matches
            </p>
          {/if}
          <button
            class="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors"
            disabled={entry.kind === "command" && entry.disabled}
            style="
              background: {i === activeIdx ? 'var(--bg-active)' : 'transparent'};
              opacity: {entry.kind === 'command' && entry.disabled ? 0.45 : 1};
            "
            onclick={() => choose(entry)}
            onmouseenter={() => {
              if (!(entry.kind === "command" && entry.disabled)) activeIdx = i;
            }}
          >
            {#if entry.kind === "hit"}
              <svg width="13" height="13" viewBox="0 0 16 16" class="shrink-0" style="color:var(--text-faint)">
                <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span class="min-w-0 flex-1">
                <span class="flex items-baseline gap-2 min-w-0">
                  <span class="truncate text-[13px]" style="color:var(--text)">{entry.title}</span>
                  <span class="truncate text-[11px] shrink-[2]" style="color:var(--text-faint)">{entry.path}</span>
                </span>
                <span class="block truncate text-[11.5px]" style="color:var(--text-muted)">
                  {#each entry.snippet as segment}
                    {#if segment.mark}
                      <mark class="rounded-[2px] px-px" style="background:var(--accent-subtle); color:var(--accent)">{segment.text}</mark>
                    {:else}
                      {segment.text}
                    {/if}
                  {/each}
                </span>
              </span>
            {:else if entry.kind === "command"}
              <span
                class="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold"
                style="background:var(--bg-hover); color:var(--text-muted)"
              >⌘</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px]" style="color:var(--text)">{entry.label}</span>
                {#if entry.detail}
                  <span class="block truncate text-[11px]" style="color:var(--text-faint)">{entry.detail}</span>
                {/if}
              </span>
              {#if entry.shortcut}
                <kbd class="rounded px-1.5 py-0.5 text-[10px]" style="background:var(--bg-hover); color:var(--text-faint)">{entry.shortcut}</kbd>
              {/if}
            {:else}
              <span
                class="h-1.5 w-1.5 shrink-0 rounded-full"
                style="background: {entry.ext === 'md' ? 'var(--accent)' : 'var(--badge-typ)'}"
              ></span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px]" style="color:var(--text)">{entry.name}</span>
                <span class="block truncate text-[11px]" style="color:var(--text-faint)">{entry.path}</span>
              </span>
            {/if}
          </button>
        {:else}
          <p class="px-4 py-6 text-center text-[13px]" style="color:var(--text-faint)">No results found</p>
        {/each}
      </div>
    </div>
  </div>
{/if}
