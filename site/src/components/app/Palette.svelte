<script>
  import AppIcon from "./AppIcon.svelte";

  let { items, placeholder, footHint, onRun, onClose } = $props();

  let q = $state("");
  let sel = $state(0);
  let inputEl = $state(null);

  function fuzzy(query, s) {
    if (!query) return { score: 0, ranges: [] };
    query = query.toLowerCase();
    const t = s.toLowerCase();
    let qi = 0, score = 0, last = -2;
    const ranges = [];
    for (let i = 0; i < t.length && qi < query.length; i++) {
      if (t[i] === query[qi]) {
        ranges.push(i);
        score += (i === last + 1 ? 3 : 1) + (i === 0 ? 2 : 0);
        last = i;
        qi++;
      }
    }
    return qi === query.length ? { score, ranges } : null;
  }

  function segments(text, ranges) {
    if (!ranges || !ranges.length) return [{ text, mark: false }];
    const set = new Set(ranges);
    const out = [];
    let buf = "", mark = false;
    const flush = () => { if (buf) out.push({ text: buf, mark }); buf = ""; };
    for (let i = 0; i < text.length; i++) {
      const m = set.has(i);
      if (m !== mark) { flush(); mark = m; }
      buf += text[i];
    }
    flush();
    return out;
  }

  const scored = $derived.by(() => {
    const arr = [];
    for (const it of items) {
      const fa = fuzzy(q, it.title);
      const fb = it.sub ? fuzzy(q, it.sub) : null;
      if (q && !fa && !fb) continue;
      arr.push({ it, ranges: fa ? fa.ranges : [], score: (fa ? fa.score : 0) + (fb ? fb.score * 0.4 : 0) });
    }
    if (q) arr.sort((a, b) => b.score - a.score);
    return arr;
  });

  const cur = $derived(Math.min(sel, Math.max(0, scored.length - 1)));
  const showGroups = $derived(!q);

  $effect(() => { q; sel = 0; });
  $effect(() => { if (inputEl) inputEl.focus(); });

  function groupLabel(i) {
    if (!showGroups) return null;
    const it = scored[i].it;
    if (i === 0) return it.group;
    return scored[i - 1].it.group !== it.group ? it.group : null;
  }

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(cur + 1, scored.length - 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(cur - 1, 0); }
    else if (e.key === "Enter") { e.preventDefault(); if (scored[cur]) onRun(scored[cur].it); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }

  function activateFromKeyboard(e, item) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onRun(item);
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="scrim" onmousedown={onClose} role="presentation">
  <div class="palette" onmousedown={(e) => e.stopPropagation()} role="presentation">
    <div class="palette-input">
      <AppIcon name="search" size={18} />
      <!-- svelte-ignore a11y_autofocus -->
      <input bind:this={inputEl} bind:value={q} {placeholder} autofocus />
      <span class="esc">esc</span>
    </div>
    <div class="palette-list">
      {#if scored.length === 0}
        <div class="palette-grp" style="padding:18px;color:var(--fg-3)">No matches</div>
      {/if}
      {#each scored as row, i (row.it.id + i)}
        {#if groupLabel(i)}
          <div class="palette-grp">{groupLabel(i)}</div>
        {/if}
        <div
          class={"palette-item" + (i === cur ? " sel" : "")}
          onmouseenter={() => (sel = i)}
          onclick={() => onRun(row.it)}
          onkeydown={(e) => activateFromKeyboard(e, row.it)}
          role="button"
          tabindex="0"
        >
          <span class="picon"><AppIcon name={row.it.icon} size={16} /></span>
          <span class="ptext">
            <div>
              {#each segments(row.it.title, row.ranges) as seg}{#if seg.mark}<mark>{seg.text}</mark>{:else}{seg.text}{/if}{/each}
            </div>
            {#if row.it.snip}
              <div class="hit-snip">{row.it.snip}</div>
            {:else if row.it.sub}
              <div class="sub">{row.it.sub}</div>
            {/if}
          </span>
          {#if row.it.hint}<span class="kbd-hint">{row.it.hint}</span>{/if}
          {#if i === cur}<AppIcon name="enter" size={14} />{/if}
        </div>
      {/each}
    </div>
    <div class="palette-foot">
      <span><AppIcon name="arrowup" size={11} /><AppIcon name="arrowdown" size={11} /> navigate</span>
      <span><AppIcon name="enter" size={11} /> open</span>
      <span class="right">{footHint}</span>
    </div>
  </div>
</div>
