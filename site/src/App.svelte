<script>
  import Changelog from "./components/Changelog.svelte";
  import DownloadCta from "./components/DownloadCta.svelte";
  import FeatureGrid from "./components/FeatureGrid.svelte";
  import Hero from "./components/Hero.svelte";
  import KeyboardDemo from "./components/KeyboardDemo.svelte";
  import Navbar from "./components/Navbar.svelte";
  import ProductPreview from "./components/ProductPreview.svelte";
  import Testimonials from "./components/Testimonials.svelte";
  import { iconUrl } from "./lib/siteData";
</script>

<svelte:head>
  <link rel="icon" href={iconUrl} />
  <link rel="apple-touch-icon" href={iconUrl} />
</svelte:head>

<Navbar />

<main id="top">
  <Hero />
  <FeatureGrid />
  <ProductPreview />
  <KeyboardDemo />
  <Changelog />
  <Testimonials />
  <DownloadCta />
</main>
