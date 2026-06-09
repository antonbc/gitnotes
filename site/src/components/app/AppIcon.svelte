<script>
  // Lucide-ish stroke icon set ported from the prototype (icons.jsx).
  export let name;
  export let size = 16;
  export let sw = 1.6;
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={sw}
  stroke-linecap="round"
  stroke-linejoin="round"
>
  {#if name === "sidebar"}
    <rect x="3" y="4" width="18" height="16" rx="2" /><line x1="9" y1="4" x2="9" y2="20" />
  {:else if name === "search"}
    <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" />
  {:else if name === "split"}
    <rect x="3" y="4" width="18" height="16" rx="2" /><line x1="12" y1="4" x2="12" y2="20" />
  {:else if name === "edit"}
    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  {:else if name === "eye"}
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" />
  {:else if name === "vim"}
    <path d="M4 5h4l4 11 4-11h4" /><path d="M9 19h6" />
  {:else if name === "moon"}
    <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" />
  {:else if name === "type"}
    <path d="M4 7V5h16v2" /><path d="M9 19h6" /><path d="M12 5v14" />
  {:else if name === "list"}
    <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="4.5" cy="6" r="1.1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r="1.1" fill="currentColor" stroke="none" />
  {:else if name === "ol"}
    <line x1="10" y1="6" x2="20" y2="6" /><line x1="10" y1="12" x2="20" y2="12" /><line x1="10" y1="18" x2="20" y2="18" /><path d="M4 7V4l-1 .7M3.2 18h2M3.2 14.6c1.6-.5 2 .9 1 1.6L3.2 18" stroke-width="1.3" />
  {:else if name === "task"}
    <rect x="3.5" y="4.5" width="7" height="7" rx="1.6" /><path d="M5.2 8l1.3 1.3 2.3-2.6" /><line x1="14" y1="6" x2="21" y2="6" /><rect x="3.5" y="13" width="7" height="7" rx="1.6" /><line x1="14" y1="16.5" x2="21" y2="16.5" />
  {:else if name === "link"}
    <path d="M10 14a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7L11 7" /><path d="M14 10a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7L13 17" />
  {:else if name === "image"}
    <rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="m4 17 4.5-4.5 3.5 3 3-3L21 16" />
  {:else if name === "code"}
    <polyline points="16 7 21 12 16 17" /><polyline points="8 7 3 12 8 17" />
  {:else if name === "codeblock"}
    <rect x="3" y="4" width="18" height="16" rx="2" /><polyline points="9 9 7 12 9 15" /><polyline points="15 9 17 12 15 15" />
  {:else if name === "quote"}
    <path d="M7 7H4v5h3l-1 4M16 7h-3v5h3l-1 4" />
  {:else if name === "table"}
    <rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="11" y1="10" x2="11" y2="20" />
  {:else if name === "plus"}
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  {:else if name === "x"}
    <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
  {:else if name === "sync"}
    <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.5-4" /><path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.5 4" /><polyline points="20 3 20 7 16 7" /><polyline points="4 21 4 17 8 17" />
  {:else if name === "pull"}
    <line x1="12" y1="20" x2="12" y2="6" /><polyline points="6 12 12 6 18 12" />
  {:else if name === "push"}
    <line x1="12" y1="4" x2="12" y2="18" /><polyline points="6 12 12 18 18 12" />
  {:else if name === "merge"}
    <circle cx="6" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><circle cx="18" cy="9" r="2.4" /><path d="M6 8.4v7.2M8.4 6.6c4 .6 7 1.4 7.6 4.6" />
  {:else if name === "branch"}
    <circle cx="6" cy="6" r="2.2" /><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="9" r="2.2" /><path d="M6 8.2v7.6M8.2 6.4c4.5 0 7.4.8 7.8 4" />
  {:else if name === "finder"}
    <rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M9 8c0 2-1.5 4-1.5 4M15 8c0 2 1.5 4 1.5 4M8.5 15c1.2 1.4 5.8 1.4 7 0" />
  {:else if name === "check"}
    <polyline points="5 12 10 17 19 7" />
  {:else if name === "chevdown"}
    <polyline points="6 9 12 15 18 9" />
  {:else if name === "doc"}
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><polyline points="14 3 14 8 19 8" />
  {:else if name === "warn"}
    <path d="M12 4 2 20h20Z" /><line x1="12" y1="10" x2="12" y2="14" /><circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
  {:else if name === "folder"}
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  {:else if name === "arrowup"}
    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="6 11 12 5 18 11" />
  {:else if name === "arrowdown"}
    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="6 13 12 19 18 13" />
  {:else if name === "enter"}
    <polyline points="9 10 4 15 9 20" /><path d="M20 4v7a4 4 0 0 1-4 4H4" />
  {:else if name === "bold"}
    <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7Z" /><path d="M7 12h7a3.5 3.5 0 0 1 0 7H7Z" />
  {/if}
</svg>
