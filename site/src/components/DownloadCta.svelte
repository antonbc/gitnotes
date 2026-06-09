<script>
  import Icon from "./Icon.svelte";
  import { downloadUrl, iconUrl, licenseUrl } from "../lib/siteData";
</script>

<section id="download" class="download-band" aria-labelledby="download-title">
  <div class="section-inner download-layout">
    <div>
      <p class="section-label">Built for your vault. Available today.</p>
      <h2 id="download-title">Install GitNotes for macOS.</h2>
      <p>
        The download points at the latest GitHub Release asset. Tag a release and the workflow
        publishes a stable DMG filename for this page.
      </p>
    </div>
    <div class="download-panel">
      <img src={iconUrl} alt="" width="58" height="58" />
      <div>
        <h3>GitNotes-aarch64.dmg</h3>
        <p>For Apple Silicon Macs.</p>
      </div>
      <a class="button button-primary" href={downloadUrl}>
        <Icon name="download" />
        Download DMG
      </a>
    </div>
  </div>
</section>

<footer class="site-footer">
  <div>
    <span>GitNotes</span>
    <p>Local-first notes for Markdown, Typst, and Git-backed vaults.</p>
  </div>
  <nav aria-label="Footer navigation">
    <a href="#product">Product</a>
    <a href="#workflows">Workflows</a>
    <a href={licenseUrl}>MIT License</a>
  </nav>
</footer>
