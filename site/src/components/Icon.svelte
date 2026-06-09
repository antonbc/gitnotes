<script>
  export let name;
</script>

<svg viewBox="0 0 24 24" aria-hidden="true">
  {#if name === "download"}
    <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 18h14" />
  {:else if name === "external"}
    <path d="M8 6h10v10M18 6 7 17M6 8v10h10" />
  {:else if name === "search"}
    <path d="m15 15 4 4M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" />
  {:else if name === "git"}
    <path d="M7 7a2 2 0 1 0-2-2 2 2 0 0 0 2 2Zm10 0a2 2 0 1 0-2-2 2 2 0 0 0 2 2ZM7 21a2 2 0 1 0-2-2 2 2 0 0 0 2 2ZM7 7v10M9 5h3a5 5 0 0 1 5 5v1" />
  {:else}
    <path d="M5 12h14M12 5v14" />
  {/if}
</svg>
