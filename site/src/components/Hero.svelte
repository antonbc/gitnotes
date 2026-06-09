<script>
  import Icon from "./Icon.svelte";
  import GitNotesApp from "./app/GitNotesApp.svelte";
  import { downloadUrl, releasesUrl, stats } from "../lib/siteData";
</script>

<section class="hero" aria-labelledby="hero-title">
  <div class="hero-grid section-inner linear-hero">
    <div class="hero-content">
      <a class="announcement animate-rise" href={releasesUrl}>
        Git-backed vaults are live <span>Release notes →</span>
      </a>
      <h1 id="hero-title" class="animate-rise delay-1">
        The local-first notes system for Markdown, Typst, and Git
      </h1>
      <p class="hero-copy animate-rise delay-2">
        Purpose-built for writing, previewing, searching, and syncing plain-file vaults. Designed
        for people who want their notes to stay fast, portable, and under their control.
      </p>
      <div class="hero-actions animate-rise delay-3" aria-label="Download actions">
        <a class="button button-primary" href={downloadUrl}>
          <Icon name="download" />
          Download for macOS
        </a>
        <a class="button button-secondary" href={releasesUrl}>
          Release notes
          <Icon name="external" />
        </a>
      </div>
      <dl class="release-strip animate-rise delay-4" aria-label="Release details">
        {#each stats as stat}
          <div>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        {/each}
      </dl>
    </div>
    <div class="hero-app animate-rise delay-3">
      <GitNotesApp initialActive="index.md" initialView="split" />
      <p class="hero-app-hint">Live preview — click around, edit, drag the window, or press <kbd>⌘K</kbd></p>
    </div>
  </div>
</section>
