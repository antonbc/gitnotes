<script lang="ts">
  import { ipc } from "$lib/ipc";
  import { renderMarkdown } from "$lib/preview/markdown";
  import type { Diagnostic, Ext } from "$lib/types";

  let {
    path,
    ext,
    content
  }: {
    path: string;
    ext: Ext;
    content: string;
  } = $props();

  let html = $state("");
  let svgPages = $state<string[]>([]);
  let diagnostics = $state<Diagnostic[]>([]);
  let lastGoodSvg = $state<string[]>([]);
  let compileToken = 0;

  $effect(() => {
    const token = ++compileToken;
    const handle = window.setTimeout(async () => {
      if (ext === "md") {
        html = renderMarkdown(content);
        diagnostics = [];
        return;
      }
      try {
        const result = await ipc.compileTypst(path, content);
        if (token !== compileToken) return;
        diagnostics = result.diagnostics;
        if (result.svgPages.length > 0) {
          svgPages = result.svgPages;
          lastGoodSvg = result.svgPages;
        } else {
          svgPages = lastGoodSvg;
        }
      } catch (err) {
        if (token !== compileToken) return;
        diagnostics = [
          {
            line: 1,
            col: 1,
            severity: "error",
            message: err instanceof Error ? err.message : String(err)
          }
        ];
        svgPages = lastGoodSvg;
      }
    }, ext === "md" ? 160 : 420);

    return () => window.clearTimeout(handle);
  });
</script>

<section class="preview" aria-label="Preview">
  {#if diagnostics.length}
    <div class="diagnostics">
      {#each diagnostics as diagnostic}
        <div class:error={diagnostic.severity === "error"}>
          <strong>{diagnostic.line}:{diagnostic.col}</strong>
          {diagnostic.message}
        </div>
      {/each}
    </div>
  {/if}

  {#if ext === "md"}
    <article class="markdown-body">{@html html}</article>
  {:else}
    <div class="typst-pages">
      {#each svgPages as svg}
        <div class="typst-page">{@html svg}</div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .preview {
    height: 100%;
    min-height: 0;
    overflow: auto;
    background: #ffffff;
    color: #17201f;
  }

  .diagnostics {
    position: sticky;
    top: 0;
    z-index: 1;
    display: grid;
    gap: 4px;
    padding: 8px 12px;
    border-bottom: 1px solid #e2b5aa;
    background: #fff4f1;
    color: #8a3328;
    font-size: 12px;
  }

  .diagnostics .error {
    color: #a52821;
  }

  .markdown-body {
    max-width: 760px;
    padding: 34px 42px 80px;
    line-height: 1.68;
  }

  .markdown-body :global(h1),
  .markdown-body :global(h2),
  .markdown-body :global(h3) {
    line-height: 1.2;
    margin: 1.3em 0 0.5em;
  }

  .markdown-body :global(pre) {
    overflow: auto;
    padding: 14px;
    border: 1px solid #cbd4d1;
    border-radius: 6px;
    background: #f3f6f5;
  }

  .markdown-body :global(code) {
    font-family: "SFMono-Regular", ui-monospace, Menlo, Consolas, monospace;
  }

  .markdown-body :global(table) {
    border-collapse: collapse;
    width: 100%;
  }

  .markdown-body :global(th),
  .markdown-body :global(td) {
    border: 1px solid #cbd4d1;
    padding: 6px 8px;
  }

  .typst-pages {
    display: grid;
    gap: 18px;
    justify-items: center;
    padding: 26px;
  }

  .typst-page {
    width: min(100%, 820px);
    background: white;
    box-shadow: 0 10px 30px rgba(23, 32, 31, 0.14);
  }

  .typst-page :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
