<script>
  import { highlightSource } from "../../lib/gitnotesRender.js";

  let { doc, vimOn, vimMode, setVimMode, onChange, onCursor } = $props();

  let ta = $state(null);
  let caret = $state(0);

  const content = $derived(doc.content);
  const lines = $derived(highlightSource(content, doc.ext));
  const activeLine = $derived(content.slice(0, caret).split("\n").length - 1);
  const normalLock = $derived(vimOn && vimMode === "normal");

  function report(pos, val) {
    val = val != null ? val : ta ? ta.value : content;
    const before = val.slice(0, pos);
    const ln = before.split("\n").length;
    const col = pos - (before.lastIndexOf("\n") + 1) + 1;
    onCursor(ln, col);
    caret = pos;
  }

  function place(pos, val) {
    const v = val != null ? val : ta ? ta.value : content;
    pos = Math.max(0, Math.min(pos, v.length));
    requestAnimationFrame(() => {
      if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = pos; }
    });
    report(pos, v);
  }

  /* ---- format application (ported from editor.jsx) ---- */
  const WRAP = { bold: { md: ["**", "**"], typ: ["*", "*"] }, italic: { md: ["*", "*"], typ: ["_", "_"] }, code: { md: ["`", "`"], typ: ["`", "`"] } };
  const PREFIX = { h1: { md: "# ", typ: "= " }, h2: { md: "## ", typ: "== " }, bullet: { md: "- ", typ: "- " }, number: { md: "1. ", typ: "+ " }, task: { md: "- [ ] ", typ: "- [ ] " } };
  const INSERT = {
    link: { md: "[text](url)", typ: '#link("url")[text]' },
    image: { md: "![alt](path)", typ: '#image("path")' },
    codeblock: { md: "```lang\n\n```", typ: "```lang\n\n```" },
    table: { md: "| Column A | Column B |\n| --- | --- |\n|  |  |", typ: "#table(columns: 2)[ ][ ]" },
  };

  function computeFormat(action, ext, val, start, end) {
    const sel = val.slice(start, end);
    if (WRAP[action]) {
      const [b, a] = WRAP[action][ext];
      const text = val.slice(0, start) + b + sel + a + val.slice(end);
      return sel ? { text, s: start + b.length, e: end + b.length } : { text, s: start + b.length, e: start + b.length };
    }
    if (action === "quote" && ext === "typ") {
      const text = val.slice(0, start) + "#quote[" + (sel || " ") + "]" + val.slice(end);
      return { text, s: start + 7, e: start + 7 + (sel || " ").length };
    }
    if (PREFIX[action] || action === "quote") {
      const pfx = action === "quote" ? "> " : PREFIX[action][ext];
      const ls = val.lastIndexOf("\n", start - 1) + 1;
      const text = val.slice(0, ls) + pfx + val.slice(ls);
      return { text, s: start + pfx.length, e: end + pfx.length };
    }
    if (INSERT[action]) {
      const ins = INSERT[action][ext];
      const text = val.slice(0, start) + ins + val.slice(end);
      const ph = ins.match(/text|alt|lang|Column A/);
      if (ph) return { text, s: start + ph.index, e: start + ph.index + ph[0].length };
      return { text, s: start + ins.length, e: start + ins.length };
    }
    return null;
  }

  export function focus() { ta && ta.focus(); }
  export function format(action) {
    if (!ta) return;
    const r = computeFormat(action, doc.ext, ta.value, ta.selectionStart, ta.selectionEnd);
    if (!r) return;
    onChange(r.text);
    requestAnimationFrame(() => {
      if (ta) { ta.focus(); ta.selectionStart = r.s; ta.selectionEnd = r.e; caret = r.s; }
    });
  }

  function onInput(e) { onChange(e.target.value); report(e.target.selectionStart, e.target.value); }
  function onSelect(e) { report(e.target.selectionStart); }

  function moveLine(dir) {
    const val = ta.value; const pos = ta.selectionStart;
    const ls = val.lastIndexOf("\n", pos - 1) + 1;
    const col = pos - ls;
    let target;
    if (dir < 0) {
      if (ls === 0) return;
      const ps = val.lastIndexOf("\n", ls - 2) + 1;
      target = Math.min(ps + col, ls - 1);
    } else {
      const le = val.indexOf("\n", pos);
      if (le === -1) return;
      const ns = le + 1; const ne = val.indexOf("\n", ns); const lim = ne === -1 ? val.length : ne;
      target = Math.min(ns + col, lim);
    }
    place(target, val);
  }

  function onKeyDown(e) {
    if (!vimOn) return;
    if (!ta) return;
    if (vimMode === "insert") { if (e.key === "Escape") { e.preventDefault(); setVimMode("normal"); } return; }
    const val = ta.value; const pos = ta.selectionStart; const k = e.key;
    if (k === "i") { e.preventDefault(); setVimMode("insert"); requestAnimationFrame(() => ta.focus()); }
    else if (k === "a") { e.preventDefault(); place(pos + 1, val); setVimMode("insert"); }
    else if (k === "o") { e.preventDefault(); const le = val.indexOf("\n", pos); const at = le === -1 ? val.length : le; const nv = val.slice(0, at) + "\n" + val.slice(at); onChange(nv); place(at + 1, nv); setVimMode("insert"); }
    else if (k === "h") { e.preventDefault(); place(pos - 1, val); }
    else if (k === "l") { e.preventDefault(); place(pos + 1, val); }
    else if (k === "j") { e.preventDefault(); moveLine(1); }
    else if (k === "k") { e.preventDefault(); moveLine(-1); }
    else if (k === "0") { e.preventDefault(); place(val.lastIndexOf("\n", pos - 1) + 1, val); }
    else if (k === "$") { e.preventDefault(); const le = val.indexOf("\n", pos); place(le === -1 ? val.length : le, val); }
    else if (k === "x") { e.preventDefault(); const nv = val.slice(0, pos) + val.slice(pos + 1); onChange(nv); place(pos, nv); }
    else if (k === "Escape") { e.preventDefault(); }
    else if (k.length === 1 && !e.metaKey && !e.ctrlKey) { e.preventDefault(); }
  }
</script>

<div class="ed-wrap">
  <div class="ed-backdrop ed-shared" aria-hidden="true">
    {#each lines as h, idx}
      <div class={"eline" + (idx === activeLine ? " active" : "")}>{@html h}</div>
    {/each}
  </div>
  <textarea
    bind:this={ta}
    class={"ed-input ed-shared" + (normalLock ? " vim-normal" : "")}
    value={content}
    spellcheck="false"
    readonly={normalLock}
    oninput={onInput}
    onselect={onSelect}
    onclick={onSelect}
    onkeyup={onSelect}
    onkeydown={onKeyDown}
  ></textarea>
</div>
