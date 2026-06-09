<script>
  import { onMount } from "svelte";
  import AppIcon from "./AppIcon.svelte";
  import Editor from "./Editor.svelte";
  import Preview from "./Preview.svelte";
  import Palette from "./Palette.svelte";
  import AppearancePopover from "./AppearancePopover.svelte";
  import SaveMenu from "./SaveMenu.svelte";
  import ConflictView from "./ConflictView.svelte";
  import Toast from "./Toast.svelte";
  import { createVault, THEMES, FONTS, COMMANDS, CONFLICT, firstLine } from "../../lib/gitnotesData.js";
  import "../../lib/gitnotes-app.css";

  let {
    initialActive = "index.md",
    initialView = "split",
    initialTheme = "dark",
    initialFont = "mono",
    initialTabs = ["index.md", "letter.typ"],
    initialVim = false,
  } = $props();

  const vault = createVault();
  let files = $state(structuredClone(vault.files));
  let groups = $state(structuredClone(vault.groups));

  // svelte-ignore state_referenced_locally
  let theme = $state(initialTheme);
  // svelte-ignore state_referenced_locally
  let font = $state(initialFont);
  // svelte-ignore state_referenced_locally
  let vimOn = $state(initialVim);
  let vimMode = $state("normal");
  // svelte-ignore state_referenced_locally
  let viewMode = $state(initialView);
  let sidebarOn = $state(true);

  // svelte-ignore state_referenced_locally
  let tabs = $state([...initialTabs]);
  // svelte-ignore state_referenced_locally
  let activePath = $state(initialActive);
  let dirty = $state({});
  let localChanges = $state({});
  let cursor = $state({ ln: 1, col: 1 });

  let overlay = $state(null); // palette | finder | conflict
  let appearOpen = $state(false);
  let saveMenuOpen = $state(false);
  let toast = $state(null);

  let autosave = $state(true);
  let saving = $state(false);
  let syncing = $state(false);

  let untitled = 1;
  let editorRef = $state(null);
  let winEl = $state(null);
  let stageEl = $state(null);
  let scale = $state(1);

  // drag
  let dragX = $state(0);
  let dragY = $state(0);
  let dragging = $state(false);

  const doc = $derived(files[activePath]);
  const dirtyCount = $derived(Object.keys(dirty).length);
  const pushCount = $derived(Object.keys(localChanges).length);
  const words = $derived(doc ? (doc.content.trim().match(/\S+/g) || []).length : 0);
  const showEdit = $derived(viewMode !== "preview");
  const showPrev = $derived(viewMode !== "edit");

  let toastTimer;
  function flash(icon, text) {
    toast = { icon, text };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = null), 1700);
  }

  function openFile(path) {
    if (!tabs.includes(path)) tabs = [...tabs, path];
    activePath = path;
    overlay = null;
  }
  function closeTab(path) {
    const idx = tabs.indexOf(path);
    const nt = tabs.filter((p) => p !== path);
    if (path === activePath) activePath = nt[Math.max(0, idx - 1)] || nt[0] || null;
    tabs = nt;
  }
  function setContent(path, val) {
    files = { ...files, [path]: { ...files[path], content: val } };
    dirty = { ...dirty, [path]: true };
  }

  function saveDisk(opts = {}) {
    const targets = opts.path ? [opts.path] : Object.keys(dirty);
    if (targets.length === 0) {
      if (opts.toast !== false) flash("check", "Nothing to save");
      return 0;
    }
    const nd = { ...dirty };
    const nlc = { ...localChanges };
    targets.forEach((p) => { delete nd[p]; nlc[p] = true; });
    dirty = nd;
    localChanges = nlc;
    saving = false;
    if (opts.toast !== false)
      flash("check", (opts.auto ? "Auto-saved" : "Saved to disk") + "  ·  " + targets.length + " file" + (targets.length === 1 ? "" : "s"));
    return targets.length;
  }

  function newFile() {
    const name = "untitled-" + untitled++ + ".md";
    files = { ...files, [name]: { name, ext: "md", group: "root", content: "# " + name.replace(".md", "") + "\n\n" } };
    groups = groups.map((g) => (g.id === "root" ? { ...g, paths: [...g.paths, name] } : g));
    tabs = [...tabs, name];
    activePath = name;
    dirty = { ...dirty, [name]: true };
    flash("plus", "Created  ·  " + name);
  }

  function commitPush(opts = {}) {
    if (syncing) return;
    const n = dirtyCount + pushCount;
    if (n === 0) { flash("check", "Nothing to push — up to date"); return; }
    dirty = {};
    localChanges = {};
    syncing = true;
    flash("sync", (opts.both ? "Saving & committing " : "Committing ") + n + " file" + (n === 1 ? "" : "s") + "…");
    setTimeout(() => { syncing = false; flash("push", "Pushed to origin/main"); }, 1000);
  }
  function syncBoth() {
    if (syncing) return;
    syncing = true;
    flash("sync", "Syncing with origin/main…");
    setTimeout(() => { dirty = {}; localChanges = {}; syncing = false; flash("check", "In sync with origin/main"); }, 1100);
  }
  function pull() { flash("pull", "Pulled — already up to date"); }

  function cycle(list, id, set) {
    const i = list.findIndex((x) => x.id === id);
    set(list[(i + 1) % list.length].id);
  }

  function runItem(it) {
    overlay = null;
    if (it.kind === "file") return openFile(it.path);
    switch (it.id) {
      case "split": viewMode = "split"; break;
      case "edit": viewMode = "edit"; break;
      case "preview": viewMode = "preview"; break;
      case "vim": vimOn = !vimOn; vimMode = "normal"; break;
      case "theme": cycle(THEMES, theme, (v) => (theme = v)); break;
      case "font": cycle(FONTS, font, (v) => (font = v)); break;
      case "newfile": newFile(); break;
      case "savedisk": saveDisk(); break;
      case "sync": commitPush(); break;
      case "syncboth": syncBoth(); break;
      case "autosave": autosave = !autosave; flash("check", autosave ? "Auto-save on" : "Auto-save off"); break;
      case "pull": pull(); break;
      case "conflict": overlay = "conflict"; break;
      case "reveal": flash("finder", "Revealed in Finder  ·  " + activePath); break;
    }
  }

  // palette item sets
  const fileItems = $derived(
    Object.keys(files).map((p) => ({
      id: "f:" + p, kind: "file", path: p, title: files[p].name, sub: p, icon: "doc",
      group: files[p].group === "quick" ? "quick/" : files[p].group === "archive" ? ".archive/" : "Notes",
    })),
  );
  const paletteItems = $derived([...COMMANDS.map((c) => ({ ...c, kind: "cmd" })), ...fileItems]);
  const finderItems = $derived(fileItems.map((it) => ({ ...it, snip: firstLine(files[it.path].content) })));

  // auto-save debounce
  $effect(() => {
    if (!autosave || dirtyCount === 0) { saving = false; return; }
    saving = true;
    const t = setTimeout(() => saveDisk({ auto: true, toast: false }), 800);
    return () => clearTimeout(t);
  });

  function appKeydown(e) {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); overlay = overlay === "palette" ? null : "palette"; }
    else if (meta && e.key.toLowerCase() === "p") { e.preventDefault(); overlay = overlay === "finder" ? null : "finder"; }
    else if (meta && e.shiftKey && e.key.toLowerCase() === "s") { e.preventDefault(); commitPush({ both: true }); }
    else if (meta && e.key.toLowerCase() === "s") { e.preventDefault(); saveDisk(); }
    else if (meta && e.key === "\\") { e.preventDefault(); viewMode = viewMode === "split" ? "edit" : "split"; }
    else if (meta && e.key.toLowerCase() === "n") { e.preventDefault(); newFile(); }
    else if (e.key === "Escape" && overlay) { overlay = null; }
  }

  function focusApp() { winEl && winEl.focus(); }
  function activateFromKeyboard(e, fn) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    fn(e);
  }

  // drag
  function startDrag(e) {
    if (e.target.closest("button, input, .seg, .pop-anchor")) return;
    dragging = true;
    const sx = e.clientX - dragX;
    const sy = e.clientY - dragY;
    const move = (ev) => { dragX = ev.clientX - sx; dragY = ev.clientY - sy; };
    const up = () => { dragging = false; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  onMount(() => {
    const fit = () => {
      if (!stageEl) return;
      scale = Math.min(1, stageEl.clientWidth / 1180);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (stageEl) ro.observe(stageEl);
    return () => ro.disconnect();
  });
</script>

<div class="gn-stage" bind:this={stageEl} style={`height:${760 * scale}px`}>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="gnapp win"
    bind:this={winEl}
    data-theme={theme}
    data-font={font}
    tabindex="0"
    style={`transform: translateX(-50%) translate(${dragX}px, ${dragY}px) scale(${scale});`}
    role="application"
    aria-label="Interactive GitNotes product demo"
    onkeydown={appKeydown}
    onpointerdown={focusApp}
  >
    <!-- titlebar -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class={"titlebar" + (dragging ? " dragging" : "")} onpointerdown={startDrag}>
      <div class="lights"><span class="light r"></span><span class="light y"></span><span class="light g"></span></div>
      <button class="tb-btn" style="margin-left:4px" title="Toggle sidebar" onclick={() => (sidebarOn = !sidebarOn)}>
        <AppIcon name="sidebar" size={17} />
      </button>
      <div class="tb-vault"><span class="dot"></span>{vault.name}</div>
      <div class="tb-spacer"></div>
      <div class="seg">
        <button class={viewMode === "edit" ? "on" : ""} onclick={() => (viewMode = "edit")}><AppIcon name="edit" size={13} />Edit</button>
        <button class={viewMode === "split" ? "on" : ""} onclick={() => (viewMode = "split")}><AppIcon name="split" size={13} />Split</button>
        <button class={viewMode === "preview" ? "on" : ""} onclick={() => (viewMode = "preview")}><AppIcon name="eye" size={13} />Preview</button>
      </div>
      <div class="pop-anchor">
        <button class={"tb-btn" + (appearOpen ? " on" : "")} title="Appearance" onclick={() => (appearOpen = !appearOpen)}>
          <AppIcon name="type" size={16} /><span style="font-weight:600">Aa</span>
        </button>
        {#if appearOpen}
          <AppearancePopover {theme} {font} setTheme={(v) => (theme = v)} setFont={(v) => (font = v)} onClose={() => (appearOpen = false)} />
        {/if}
      </div>
      <button class="tb-btn" title="Command palette (⌘K)" onclick={() => (overlay = "palette")}>
        <AppIcon name="search" size={15} /><span class="kbd-hint" style="margin-left:2px">⌘K</span>
      </button>
    </div>

    <!-- body -->
    <div class="body">
      {#if sidebarOn}
        <div class="sidebar">
          <div
            class="sb-search"
            onclick={() => (overlay = "finder")}
            onkeydown={(e) => activateFromKeyboard(e, () => (overlay = "finder"))}
            role="button"
            tabindex="0"
          >
            <AppIcon name="search" size={14} />
            <input placeholder="Search notes…" readonly value="" onfocus={() => (overlay = "finder")} />
            <kbd class="kbd-hint">⌘P</kbd>
          </div>
          <div class="sb-scroll">
            {#each groups as g}
              <div>
                <div class="sb-section" style={g.muted ? "opacity:0.7" : ""}>
                  <AppIcon name="folder" size={12} />{g.label}<span class="count">{g.paths.length}</span>
                </div>
                {#each g.paths as path}
                  {@const f = files[path]}
	                  <div
	                    class={"file" + (path === activePath ? " active" : "")}
	                    title={path}
	                    onclick={() => openFile(path)}
	                    onkeydown={(e) => activateFromKeyboard(e, () => openFile(path))}
	                    oncontextmenu={(e) => { e.preventDefault(); flash("finder", "Revealed in Finder"); }}
	                    role="button"
	                    tabindex="0"
	                  >
                    <span class="ficon"><AppIcon name="doc" size={14} /></span>
                    <span class="fname">{f.name.replace(/\.(md|typ)$/, "")}</span>
                    {#if dirty[path]}
                      <span class="dirty-dot" title="Unsaved changes"></span>
                    {:else}
                      <span class="file-ext">{f.ext}</span>
                    {/if}
                  </div>
                {/each}
              </div>
            {/each}
          </div>
          <div class="sb-foot">
            <AppIcon name="branch" size={13} /><span>main</span>
            <span style="margin-left:auto;color:var(--fg-3)">{Object.keys(files).length} notes</span>
          </div>
        </div>
      {/if}

      <div class="editor-col">
        <!-- tabs -->
        <div class="tabbar">
          {#each tabs as path}
            {@const f = files[path]}
            <div
              class={"tab" + (path === activePath ? " active" : "")}
              title={path}
              onclick={() => (activePath = path)}
              onkeydown={(e) => activateFromKeyboard(e, () => (activePath = path))}
              role="button"
              tabindex="0"
            >
              <AppIcon name="doc" size={13} />
              <span class="tname">{f.name}</span>
              {#if dirty[path]}
                <span
                  class="tdirty"
                  title="Unsaved"
                  onclick={(e) => { e.stopPropagation(); closeTab(path); }}
                  onkeydown={(e) => activateFromKeyboard(e, (ev) => { ev.stopPropagation(); closeTab(path); })}
                  role="button"
                  tabindex="0"
                ></span>
              {:else}
                <span
                  class="tclose"
                  onclick={(e) => { e.stopPropagation(); closeTab(path); }}
                  onkeydown={(e) => activateFromKeyboard(e, (ev) => { ev.stopPropagation(); closeTab(path); })}
                  role="button"
                  tabindex="0"
                ><AppIcon name="x" size={12} /></span>
              {/if}
            </div>
          {/each}
          <button class="tab-new" title="New note (⌘N)" onclick={newFile}><AppIcon name="plus" size={15} /></button>
        </div>

        <!-- formatting toolbar -->
        {#if doc}
          <div class="fmtbar">
            <button class="fmt-btn" title="Bold" onclick={() => editorRef?.format("bold")}><b>B</b></button>
            <button class="fmt-btn" title="Italic" onclick={() => editorRef?.format("italic")}><i>I</i></button>
            <span class="fmt-sep"></span>
            <button class="fmt-btn" title="Heading 1" onclick={() => editorRef?.format("h1")}>H1</button>
            <button class="fmt-btn" title="Heading 2" onclick={() => editorRef?.format("h2")}>H2</button>
            <span class="fmt-sep"></span>
            <button class="fmt-btn" title="Bullet list" onclick={() => editorRef?.format("bullet")}><AppIcon name="list" size={15} /></button>
            <button class="fmt-btn" title="Numbered list" onclick={() => editorRef?.format("number")}><AppIcon name="ol" size={15} /></button>
            <button class="fmt-btn" title="Task" onclick={() => editorRef?.format("task")}><AppIcon name="task" size={15} /></button>
            <span class="fmt-sep"></span>
            <button class="fmt-btn" title="Link" onclick={() => editorRef?.format("link")}><AppIcon name="link" size={15} /></button>
            <button class="fmt-btn" title="Image" onclick={() => editorRef?.format("image")}><AppIcon name="image" size={15} /></button>
            <button class="fmt-btn" title="Inline code" onclick={() => editorRef?.format("code")}><AppIcon name="code" size={15} /></button>
            <button class="fmt-btn" title="Code block" onclick={() => editorRef?.format("codeblock")}><AppIcon name="codeblock" size={15} /></button>
            <button class="fmt-btn" title="Quote" onclick={() => editorRef?.format("quote")}><AppIcon name="quote" size={15} /></button>
            <button class="fmt-btn" title="Table" onclick={() => editorRef?.format("table")}><AppIcon name="table" size={15} /></button>
            <div class="fmt-tag">
              <span style={`font-family:var(--font-mono);color:${doc.ext === "typ" ? "var(--badge-typ)" : "var(--accent)"}`}>{doc.ext === "typ" ? "Typst" : "Markdown"}</span>
              <span style="width:1px;height:16px;background:var(--line)"></span>
              <button class="fmt-btn" style={`color:${vimOn ? "var(--accent)" : "var(--fg-3)"}`} title="Toggle Vim mode" onclick={() => { vimOn = !vimOn; vimMode = "normal"; }}>
                <AppIcon name="vim" size={15} /><span style="font-size:11px;font-weight:600">Vim</span>
              </button>
            </div>
          </div>
        {/if}

        <!-- panes -->
        <div class="panes">
          {#if doc && showEdit}
            <div class="pane edit" style={showPrev ? "" : "flex:1"}>
              {#key activePath}
                <Editor bind:this={editorRef} {doc} {vimOn} {vimMode} setVimMode={(m) => (vimMode = m)} onChange={(v) => setContent(activePath, v)} onCursor={(ln, col) => (cursor = { ln, col })} />
              {/key}
            </div>
          {/if}
          {#if doc && showPrev}
            <div class="pane preview"><Preview {doc} /></div>
          {/if}
          {#if !doc}
            <div class="empty">No note open — press ⌘P to find one</div>
          {/if}
        </div>

        <!-- status bar -->
        <div class="statusbar">
          <button class="st-item btn" title="Branch — view conflict demo" onclick={() => (overlay = "conflict")}>
            <AppIcon name="branch" size={13} /><span style="font-weight:600">main</span>
          </button>

          {#if dirtyCount > 0}
            {#if autosave}
              <span class="st-item" style="color:var(--accent)"><span class="spin" style="display:inline-flex"><AppIcon name="sync" size={12} /></span>Auto-saving…</span>
            {:else}
              <span class="st-item" style="color:var(--warn)"><span class="dot" style="background:var(--warn)"></span>{dirtyCount} unsaved</span>
            {/if}
          {:else if pushCount > 0}
            <span class="st-item" style="color:var(--warn)"><AppIcon name="arrowup" size={12} />{pushCount} to push</span>
          {:else}
            <span class="st-item" style="color:var(--ok)"><AppIcon name="check" size={12} />in sync</span>
          {/if}

          <div class="menu-anchor">
            <button class={"st-item btn" + (saveMenuOpen ? " on" : "")} disabled={syncing} onclick={() => (saveMenuOpen = !saveMenuOpen)}>
              <span class={syncing ? "spin" : ""} style="display:inline-flex"><AppIcon name={syncing ? "sync" : "push"} size={13} /></span>
              {syncing ? "Syncing…" : "Save / Sync"}
              <AppIcon name="chevdown" size={11} />
            </button>
            {#if saveMenuOpen}
              <SaveMenu
                {autosave}
                {dirtyCount}
                {pushCount}
                setAutosave={(v) => { autosave = v; flash("check", v ? "Auto-save on" : "Auto-save off"); }}
                onSaveDisk={() => saveDisk()}
                onPush={() => commitPush()}
                onSaveAndPush={() => commitPush({ both: true })}
                onSync={syncBoth}
                onPull={pull}
                onClose={() => (saveMenuOpen = false)}
              />
            {/if}
          </div>

          <button class="st-item btn" title="Toggle auto-save" style={`color:${autosave ? "var(--ok)" : "var(--fg-3)"}`} onclick={() => { autosave = !autosave; flash("check", autosave ? "Auto-save on" : "Auto-save off"); }}>
            <span class="dot" style={`background:${autosave ? "var(--ok)" : "var(--fg-3)"}`}></span>Auto-save {autosave ? "on" : "off"}
          </button>

          <div class="st-spacer"></div>
          {#if doc}<span class="st-item st-mono">{doc.ext.toUpperCase()}</span>{/if}
          <span class="st-item st-mono">Ln {cursor.ln}, Col {cursor.col}</span>
          <span class="st-item st-mono">{words}w</span>
          <button class="st-item btn" title="Toggle Vim" onclick={() => { vimOn = !vimOn; vimMode = "normal"; }}>
            <span class={"st-vim " + (vimOn ? vimMode : "off")}>{vimOn ? vimMode.toUpperCase() : "VIM OFF"}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- overlays -->
    {#if overlay === "palette"}
      <Palette items={paletteItems} placeholder="Run a command or jump to a note…" footHint="⌘K" onRun={runItem} onClose={() => (overlay = null)} />
    {/if}
    {#if overlay === "finder"}
      <Palette items={finderItems} placeholder="Find a note by name…" footHint="⌘P · fuzzy" onRun={runItem} onClose={() => (overlay = null)} />
    {/if}
    {#if overlay === "conflict"}
      <ConflictView conflict={CONFLICT} onResolve={() => { overlay = null; flash("merge", "Conflict resolved · staged for commit"); }} onClose={() => (overlay = null)} />
    {/if}

    {#if toast}<Toast icon={toast.icon} text={toast.text} />{/if}
  </div>
</div>

<style>
  .gn-stage {
    position: relative;
    width: 100%;
  }
  .gn-stage :global(.gnapp.win) {
    position: absolute;
    top: 0;
    left: 50%;
    transform-origin: top center;
    outline: none;
  }
</style>
