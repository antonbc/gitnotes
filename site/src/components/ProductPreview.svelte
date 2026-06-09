<script>
  import GitNotesApp from "./app/GitNotesApp.svelte";
</script>

<section id="workflows" class="preview-band" aria-labelledby="preview-title">
  <div class="section-inner preview-layout">
    <div>
      <p class="section-label">1.0 Capture · 2.0 Write · 3.0 Sync</p>
      <h2 id="preview-title">Move from idea to committed note without changing tools.</h2>
      <p>
        GitNotes is designed for repeated daily writing: file tree, command palette, search, split
        preview, trash restore, and Git status stay close without turning the app into a
        project-management board.
      </p>
      <div class="workflow-links" aria-label="GitNotes workflows">
        <a href="#workflows">Capture <span>→</span></a>
        <a href="#workflows">Preview <span>→</span></a>
        <a href="#workflows">Sync <span>→</span></a>
      </div>
    </div>

    <div class="preview-frame">
      <GitNotesApp initialActive="letter.typ" initialView="split" initialTabs={["letter.typ", "index.md"]} />
    </div>
  </div>
</section>
