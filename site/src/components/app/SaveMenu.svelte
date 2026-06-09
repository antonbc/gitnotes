<script>
  import AppIcon from "./AppIcon.svelte";

  let { autosave, setAutosave, dirtyCount, pushCount, onSaveDisk, onPush, onSaveAndPush, onSync, onPull, onClose } = $props();

  const nothingToPush = $derived(dirtyCount === 0 && pushCount === 0);
  const run = (fn) => () => { fn(); onClose(); };

  function onKey(e) { if (e.key === "Escape") onClose(); }
</script>

<svelte:window onkeydown={onKey} />

<div style="position:absolute;inset:0;z-index:55" onmousedown={onClose} role="presentation"></div>
<div class="menu" onmousedown={(e) => e.stopPropagation()} role="presentation">
  <div class="menu-grp">Save locally</div>
  <button type="button" class={"menu-item" + (dirtyCount === 0 ? " disabled" : "")} onclick={run(onSaveDisk)} disabled={dirtyCount === 0}>
    <span class="mi-icon"><AppIcon name="doc" size={16} /></span>
    <span class="mi-t"><span class="mt">Save to disk</span><span class="md2">Atomic write into the vault folder</span></span>
    <span class="mi-key">⌘S</span>
  </button>
  <div class="menu-sep"></div>
  <div class="menu-grp">Sync with GitHub</div>
  <button type="button" class={"menu-item" + (nothingToPush ? " disabled" : "")} onclick={run(onPush)} disabled={nothingToPush}>
    <span class="mi-icon"><AppIcon name="push" size={16} /></span>
    <span class="mi-t"><span class="mt">Commit &amp; push</span><span class="md2">Send committed changes to origin/main</span></span>
    <span class="mi-key">⇧⌘S</span>
  </button>
  <button type="button" class={"menu-item" + (nothingToPush ? " disabled" : "")} onclick={run(onSaveAndPush)} disabled={nothingToPush}>
    <span class="mi-icon"><AppIcon name="sync" size={16} /></span>
    <span class="mi-t"><span class="mt">Save &amp; push <span style="color:var(--fg-3);font-weight:500">· both</span></span><span class="md2">Write to disk, then commit &amp; push</span></span>
  </button>
  <button type="button" class="menu-item" onclick={run(onSync)}>
    <span class="mi-icon"><AppIcon name="pull" size={16} /></span>
    <span class="mi-t"><span class="mt">Sync</span><span class="md2">Pull from remote, then push local commits</span></span>
  </button>
  <button type="button" class="menu-item" onclick={run(onPull)}>
    <span class="mi-icon"><AppIcon name="arrowdown" size={16} /></span>
    <span class="mi-t"><span class="mt">Pull only</span><span class="md2">Fetch &amp; merge origin/main</span></span>
  </button>
  <div class="menu-sep"></div>
  <button type="button" class="menu-toggle" onclick={() => setAutosave(!autosave)}>
    <span class="mi-icon" style={`color:${autosave ? "var(--ok)" : "var(--fg-3)"}`}><AppIcon name="check" size={16} /></span>
    <span class="mi-t"><span class="mt">Auto-save</span><span class="md2">Write to disk ~0.8s after you stop typing</span></span>
    <span class={"switch" + (autosave ? " on" : "")}><span class="knob"></span></span>
  </button>
</div>
