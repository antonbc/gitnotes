<script lang="ts">
  import type { Ext, FormatAction, ViewMode } from "$lib/types";

  let {
    ext,
    vimMode,
    toolbar,
    viewMode,
    onFormat,
    onVimToggle,
    onToolbarToggle,
    onViewMode
  }: {
    ext: Ext | null;
    vimMode: boolean;
    toolbar: boolean;
    viewMode: ViewMode;
    onFormat: (action: FormatAction) => void;
    onVimToggle: () => void;
    onToolbarToggle: () => void;
    onViewMode: (mode: ViewMode) => void;
  } = $props();

  const actions: { action: FormatAction; label: string; title: string }[] = [
    { action: "bold", label: "B", title: "Bold" },
    { action: "italic", label: "I", title: "Italic" },
    { action: "heading1", label: "H1", title: "Heading 1" },
    { action: "heading2", label: "H2", title: "Heading 2" },
    { action: "bullet", label: "-", title: "Bullet list" },
    { action: "numbered", label: "1.", title: "Numbered list" },
    { action: "task", label: "[ ]", title: "Task" },
    { action: "link", label: "@", title: "Link" },
    { action: "image", label: "img", title: "Image" },
    { action: "inlineCode", label: "`", title: "Inline code" },
    { action: "codeBlock", label: "{ }", title: "Code block" },
    { action: "quote", label: ">", title: "Quote" },
    { action: "table", label: "tbl", title: "Table" }
  ];
</script>

<div class="toolbar">
  <div class="segments" aria-label="View mode">
    <button class:active={viewMode === "edit"} title="Edit" onclick={() => onViewMode("edit")}>Edit</button>
    <button class:active={viewMode === "split"} title="Split" onclick={() => onViewMode("split")}>Split</button>
    <button class:active={viewMode === "preview"} title="Preview" onclick={() => onViewMode("preview")}>Preview</button>
  </div>

  <label class="toggle">
    <input type="checkbox" checked={vimMode} onchange={onVimToggle} />
    Vim
  </label>
  <label class="toggle">
    <input type="checkbox" checked={toolbar} onchange={onToolbarToggle} />
    Tools
  </label>

  {#if toolbar && ext}
    <div class="tools" aria-label={`${ext} formatting`}>
      {#each actions as item}
        <button title={item.title} onclick={() => onFormat(item.action)}>{item.label}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 6px 10px;
    border-bottom: 1px solid #cbd4d1;
    background: #f8faf9;
    overflow-x: auto;
  }

  .segments,
  .tools {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  button {
    min-width: 32px;
    height: 30px;
    border: 1px solid #b8c6c2;
    border-radius: 6px;
    background: #ffffff;
    color: #17201f;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  button:hover,
  button.active {
    border-color: #2d7770;
    background: #e8f3f1;
  }

  .segments button {
    min-width: 62px;
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
    color: #33413f;
    font-size: 12px;
  }
</style>
