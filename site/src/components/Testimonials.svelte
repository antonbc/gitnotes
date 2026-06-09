<script>
  const quotes = [
    {
      quote: "Plain files, quick preview, and Git sync are the whole point. GitNotes keeps that loop tight.",
      byline: "Local-first workflow",
    },
    {
      quote: "It feels like a product tool for notes: focused, fast, and honest about where the data lives.",
      byline: "Markdown and Typst vaults",
    },
  ];
</script>

<section class="testimonial-band" aria-label="GitNotes testimonials">
  <div class="section-inner testimonial-grid">
    {#each quotes as quote}
      <figure>
        <blockquote>{quote.quote}</blockquote>
        <figcaption>{quote.byline}</figcaption>
      </figure>
    {/each}
  </div>
</section>
