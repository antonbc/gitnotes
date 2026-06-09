<script>
  import AppIcon from "./AppIcon.svelte";
  import { renderMarkdown, renderTypst } from "../../lib/gitnotesRender.js";

  let { doc } = $props();

  const typ = $derived(doc.ext === "typ" ? renderTypst(doc.content) : null);
  const mdHtml = $derived(doc.ext === "typ" ? "" : renderMarkdown(doc.content));
</script>

{#if doc.ext === "typ"}
  <div style="height:100%;display:flex;flex-direction:column;min-height:0">
    <div class="typ-preview" style="flex:1;overflow-y:auto">{@html typ.html}</div>
    <div class="diag">
      <div class="diag-head">
        <AppIcon name="warn" size={12} />
        Diagnostics {typ.diagnostics.length ? "(" + typ.diagnostics.length + ")" : ""}
        <span style="margin-left:auto;font-weight:500;color:var(--fg-3)">typst · compiled in 41ms</span>
      </div>
      {#if typ.diagnostics.length === 0}
        <div class="diag-empty"><AppIcon name="check" size={13} /> No errors — last good render shown.</div>
      {:else}
        {#each typ.diagnostics as d}
          <div class={"diag-row " + d.severity}>
            <span class="sev">{d.severity === "error" ? "error" : "warn"}</span>
            <span class="loc">{d.line}:{d.col}</span>
            <span class="msg">{d.message}</span>
          </div>
        {/each}
      {/if}
    </div>
  </div>
{:else}
  <div class="md">{@html mdHtml}</div>
{/if}
