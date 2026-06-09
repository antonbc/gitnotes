<script>
  import AppIcon from "./AppIcon.svelte";

  let { conflict, onResolve, onClose } = $props();
  let choice = $state(null);
</script>

<div class="scrim" onmousedown={onClose} role="presentation">
  <div class="conflict" onmousedown={(e) => e.stopPropagation()} role="presentation">
    <div class="cf-head">
      <span class="ci"><AppIcon name="merge" size={17} /></span>
      <div>
        <div class="ct">Merge conflict</div>
        <div class="cs">Your local edits and the pulled version both changed this note. Pick a side, or keep both.</div>
      </div>
      <span class="cpath">{conflict.path}</span>
    </div>
    <div class="cf-cols">
      <div class={"cf-col ours" + (choice === "theirs" ? " dim" : "")}>
        <div class="cf-coltitle"><span class="src">LOCAL</span> your version <span class="meta">HEAD</span></div>
        <div class="cf-body">
          {#each conflict.ours as l}
            <div class={"cf-line" + (l.t ? " " + l.t : "")}>{l.x || " "}</div>
          {/each}
        </div>
      </div>
      <div class={"cf-col theirs" + (choice === "ours" ? " dim" : "")}>
        <div class="cf-coltitle"><span class="src">REMOTE</span> pulled version <span class="meta">origin/main</span></div>
        <div class="cf-body">
          {#each conflict.theirs as l}
            <div class={"cf-line" + (l.t ? " " + l.t : "")}>{l.x || " "}</div>
          {/each}
        </div>
      </div>
    </div>
    <div class="cf-foot">
      <button class={"btn" + (choice === "ours" ? " primary" : "")} onclick={() => (choice = "ours")}>Use local</button>
      <button class={"btn" + (choice === "theirs" ? " primary" : "")} onclick={() => (choice = "theirs")}>Use remote</button>
      <button class={"btn" + (choice === "both" ? " primary" : "")} onclick={() => (choice = "both")}>Keep both</button>
      <span class="grow"></span>
      <button class="btn ghost" onclick={onClose}>Cancel</button>
      <button class="btn primary" disabled={!choice} onclick={() => choice && onResolve(choice)}>
        <AppIcon name="check" size={14} /> Resolve &amp; stage
      </button>
    </div>
  </div>
</div>
