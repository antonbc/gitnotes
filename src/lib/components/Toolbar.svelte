<script lang="ts">
  import { tooltip } from "$lib/actions/tooltip";
  import type { Ext, FormatAction } from "$lib/types";

  let {
    ext,
    vimMode,
    onFormat,
    onVimToggle,
  }: {
    ext: Ext | null;
    vimMode: boolean;
    onFormat: (action: FormatAction) => void;
    onVimToggle: () => void;
  } = $props();

  const actions: { action: FormatAction; label: string; name: string; shortcut?: string }[] = [
    { action: "bold",       label: "B",    name: "Bold",          shortcut: "⌘B" },
    { action: "italic",     label: "I",    name: "Italic",        shortcut: "⌘I" },
    { action: "heading1",   label: "H1",   name: "Heading 1",     shortcut: "⌥⌘1" },
    { action: "heading2",   label: "H2",   name: "Heading 2",     shortcut: "⌥⌘2" },
    { action: "bullet",     label: "•—",   name: "Bullet list",   shortcut: "⇧⌘8" },
    { action: "numbered",   label: "1.",   name: "Numbered list", shortcut: "⇧⌘7" },
    { action: "task",       label: "☐",    name: "Task",          shortcut: "⇧⌘X" },
    { action: "link",       label: "[]",   name: "Link",          shortcut: "⇧⌘K" },
    { action: "image",      label: "img",  name: "Image" },
    { action: "inlineCode", label: "`",    name: "Inline code",   shortcut: "⌘E" },
    { action: "codeBlock",  label: "{ }",  name: "Code block",    shortcut: "⇧⌘E" },
    { action: "quote",      label: "❝",    name: "Blockquote" },
    { action: "table",      label: "⊞",    name: "Table" },
  ];
</script>

<div class="flex items-center h-[38px] px-2 bg-bg-editor border-b-[0.5px] border-border-sub overflow-x-auto gap-0.5 shrink-0">
  <div class="flex items-center gap-px flex-1">
    {#each actions as { action, label, name, shortcut }}
      <button
        class="h-[26px] min-w-[28px] px-1.5 rounded-md bg-transparent text-text-muted text-[12.5px] leading-none inline-flex items-center justify-center transition-colors duration-100 hover:bg-bg-hover hover:text-text active:opacity-70"
        class:font-extrabold={action === 'bold'}
        class:italic={action === 'italic'}
        aria-label={name}
        use:tooltip={{ label: name, shortcut }}
        onclick={() => onFormat(action)}
      >{label}</button>
    {/each}
  </div>

  <div class="flex items-center gap-1 ml-auto pl-2">
    {#if ext}
      <span
        class="text-[11px] font-semibold tracking-[0.01em]"
        style="color:{ext === 'typ' ? 'var(--badge-typ)' : 'var(--accent)'}"
      >{ext === 'typ' ? 'Typst' : 'Markdown'}</span>
    {/if}

    <span class="w-px h-4 bg-border mx-1"></span>

    <button
      class="inline-flex items-center justify-center gap-[5px] h-[26px] px-2 rounded-md text-[12px] font-medium leading-none transition-colors duration-100 {vimMode
        ? 'bg-accent-sub text-accent'
        : 'bg-transparent text-text-faint hover:bg-bg-hover hover:text-text-muted'}"
      aria-label={vimMode ? "Disable Vim mode" : "Enable Vim mode"}
      use:tooltip={{ label: vimMode ? "Disable Vim mode" : "Enable Vim mode" }}
      onclick={onVimToggle}
    >
      <svg class="block shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M4 5h4l4 11 4-11h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 19h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      Vim
    </button>
  </div>
</div>
