<script lang="ts">
  import { ipc } from "$lib/ipc";
  import { errorMessage } from "$lib/errors";
  import { renderMarkdown } from "$lib/preview/markdown";
  import type { Diagnostic, Ext } from "$lib/types";

  let {
    path,
    ext,
    content,
    version = 0,
  }: {
    path: string;
    ext: Ext;
    content: string;
    version?: number;
  } = $props();

  const emptyClass =
    "grid place-items-center min-h-[220px] p-8 text-text-faint text-[13px] font-[family-name:var(--font-ui)]";

  // Markdown renders synchronously in the same update as the editor change,
  // so the preview can never lag a frame behind or briefly show the previous
  // tab's note (which the old effect-based render did).
  const html = $derived(ext === "md" ? renderMarkdown(content) : "");

  let svgPages = $state<string[]>([]);
  let diagnostics = $state<Diagnostic[]>([]);
  let lastGoodSvg = $state<string[]>([]);
  let rendering = $state(false);
  let compileToken = 0;
  let lastCompiledPath: string | null = null;

  $effect(() => {
    const sourcePath = path;
    const sourceExt = ext;
    const sourceContent = content;
    version;
    const token = ++compileToken;

    if (sourceExt === "md") {
      diagnostics = [];
      svgPages = [];
      rendering = false;
      lastCompiledPath = null;
      return;
    }

    // Switching to a different Typst note: drop the previous note's pages so
    // they never show under the new tab while its first compile runs.
    if (sourcePath !== lastCompiledPath) {
      lastCompiledPath = sourcePath;
      svgPages = [];
      lastGoodSvg = [];
      diagnostics = [];
    }

    if (!sourceContent.trim()) {
      diagnostics = [];
      svgPages = [];
      rendering = false;
      return;
    }

    rendering = true;
    const handle = window.setTimeout(async () => {
      try {
        const result = await ipc.compileTypst(sourcePath, sourceContent);
        if (token !== compileToken) return;
        diagnostics = result.diagnostics;
        if (result.svgPages.length > 0) {
          svgPages = result.svgPages;
          lastGoodSvg = result.svgPages;
        } else {
          svgPages = lastGoodSvg;
        }
        rendering = false;
      } catch (err) {
        if (token !== compileToken) return;
        diagnostics = [
          {
            line: 1,
            col: 1,
            severity: "error",
            message: errorMessage(err),
          },
        ];
        svgPages = lastGoodSvg;
        rendering = false;
      }
    }, 80);

    return () => window.clearTimeout(handle);
  });
</script>

<section class="h-full min-h-0 overflow-auto bg-bg-editor text-text border-l border-border-sub" aria-label="Live preview" aria-busy={rendering}>
  <!-- Diagnostics banner -->
  {#if diagnostics.length}
    <div
      class="sticky top-0 z-10 flex flex-col gap-1 border-b px-4 py-2 text-[12px]"
      style="background:var(--danger-subtle); border-color:var(--danger); color:var(--danger)"
    >
      {#each diagnostics as d}
        <div class="flex gap-2">
          <span class="font-mono font-semibold shrink-0">{d.line}:{d.col}</span>
          <span class="{d.severity === 'error' ? 'font-medium' : ''}">{d.message}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if ext === "md"}
    {#if content.trim()}
      <article class="markdown-body max-w-[720px] px-11 pt-9 pb-20 leading-[1.72] text-[15px] text-text">{@html html}</article>
    {:else}
      <div class={emptyClass}>Nothing to preview yet.</div>
    {/if}
  {:else}
    {#if svgPages.length}
      <div class="grid gap-5 justify-items-center p-7">
        {#each svgPages as svg}
          <div class="typst-page w-[min(100%,800px)] bg-white rounded overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.16)]">{@html svg}</div>
        {/each}
      </div>
    {:else if content.trim()}
      <div class={emptyClass}>Live preview is rendering...</div>
    {:else}
      <div class={emptyClass}>Nothing to preview yet.</div>
    {/if}
  {/if}
</section>

<style>
  /* ── Markdown prose (markdown-it generated DOM) ── */
  .markdown-body :global(h1),
  .markdown-body :global(h2),
  .markdown-body :global(h3),
  .markdown-body :global(h4) {
    line-height: 1.25;
    margin: 1.6em 0 0.5em;
    color: var(--text);
  }

  .markdown-body :global(h1) { font-size: 1.7em; }
  .markdown-body :global(h2) { font-size: 1.35em; }
  .markdown-body :global(h3) { font-size: 1.1em; }

  .markdown-body :global(a) { color: var(--accent); text-decoration: underline; }
  .markdown-body :global(a:hover) { color: var(--accent-hover); }

  .markdown-body :global(blockquote) {
    margin: 1em 0;
    padding: 0 0 0 16px;
    border-left: 3px solid var(--border);
    color: var(--text-muted);
  }

  .markdown-body :global(pre) {
    overflow: auto;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-sidebar);
    font-size: 13px;
    line-height: 1.55;
  }

  .markdown-body :global(code) {
    font-family: var(--font-editor, monospace);
    font-size: 0.875em;
  }

  .markdown-body :global(:not(pre) > code) {
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--bg-sidebar);
    border: 1px solid var(--border-subtle);
  }

  .markdown-body :global(table) {
    border-collapse: collapse;
    width: 100%;
    font-size: 14px;
  }

  .markdown-body :global(th),
  .markdown-body :global(td) {
    border: 1px solid var(--border);
    padding: 6px 12px;
  }

  .markdown-body :global(th) {
    background: var(--bg-sidebar);
    font-weight: 600;
  }

  .markdown-body :global(tr:nth-child(even) td) {
    background: var(--bg-hover);
  }

  .markdown-body :global(hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 2em 0;
  }

  .markdown-body :global(input[type="checkbox"]) {
    accent-color: var(--accent);
  }

  /* ── Typst (typst-compiled svg pages) ── */
  .typst-page :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
