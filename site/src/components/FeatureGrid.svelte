<script>
  import Icon from "./Icon.svelte";
  import { features } from "../lib/siteData";
</script>

<section id="product" class="feature-band" aria-labelledby="feature-title">
  <div class="section-inner">
    <div class="section-heading">
      <p class="section-label">A new species of notes tool</p>
      <h2 id="feature-title">
        Purpose-built for local vaults, fast writing, and Git workflows.
      </h2>
    </div>
    <div class="feature-grid">
      {#each features as feature, index}
        <article class={`feature-card feature-card-${feature.tone}`} style={`--stagger:${index * 90}ms`}>
          <span class="fig-label">FIG 0.{index + 2}</span>
          <span class={`feature-mark feature-mark-${feature.tone}`}></span>
          <small>{feature.kicker}</small>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
          <div class="feature-icon">
            <Icon name={feature.tone === "gold" ? "git" : feature.tone === "blue" ? "search" : "plus"} />
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>
