<script>
  import { downloadUrl, githubUrl, iconUrl } from "../lib/siteData";
</script>

<header class="site-header animate-drop" aria-label="Primary navigation">
  <a class="brand" href="#top" aria-label="GitNotes home">
    <img src={iconUrl} alt="" width="26" height="26" />
    <span>GitNotes</span>
  </a>
  <nav class="nav-links" aria-label="Site navigation">
    <a href="#product">Product</a>
    <a href="#workflows">Workflows</a>
    <a href="#changelog">Changelog</a>
    <a href="#download">Download</a>
  </nav>
  <div class="nav-actions">
    <a class="nav-ghost" href={githubUrl}>GitHub</a>
    <a class="button button-primary" href={downloadUrl}>Download</a>
  </div>
</header>
