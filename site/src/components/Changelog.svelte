<script>
  const updates = [
    {
      title: "Download site",
      date: "Jun 8, 2026",
      text: "GitHub Pages-ready Svelte site with a direct latest-release DMG link.",
    },
    {
      title: "Git sync panel",
      date: "Jun 8, 2026",
      text: "Commit, push, pull, and conflict resolution live beside the editor.",
    },
    {
      title: "Typst preview",
      date: "Jun 8, 2026",
      text: "Structured notes can compile next to Markdown in the same vault.",
    },
  ];
</script>

<section id="changelog" class="changelog-band" aria-labelledby="changelog-title">
  <div class="section-inner">
    <div class="section-heading">
      <p class="section-label">Changelog</p>
      <h2 id="changelog-title">Latest improvements for a faster notes system.</h2>
    </div>
    <div class="changelog-grid">
      {#each updates as update}
        <article class="changelog-card">
          <span>{update.date}</span>
          <h3>{update.title}</h3>
          <p>{update.text}</p>
        </article>
      {/each}
    </div>
  </div>
</section>
