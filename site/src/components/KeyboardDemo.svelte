<script>
  import { commands, iconUrl, keycaps, resolveShortcut } from "../lib/siteData";

  let activeCommandName = "save";

  $: activeCommand = commands[activeCommandName];

  function setCommand(commandName) {
    activeCommandName = commandName;
  }

  function handleKeydown(event) {
    const commandName = resolveShortcut(event);
    if (!commandName) return;

    event.preventDefault();
    setCommand(commandName);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="keyboard-band" aria-labelledby="keyboard-title">
  <div class="section-inner keyboard-layout">
    <div class="keyboard-copy">
      <p class="section-label">Shortcut preview</p>
      <h2 id="keyboard-title">Try the app from the keyboard.</h2>
      <p>
        Use the keycaps or press the matching shortcut. The preview updates like a tiny GitNotes
        session, with search, sidebar toggle, save, and Git sync.
      </p>
    </div>

    <div class="keyboard-demo">
      <div class="demo-window" aria-live="polite">
        <div class="demo-topbar">
          <div class="demo-brand">
            <img src={iconUrl} alt="" width="24" height="24" />
            <span>GitNotes</span>
          </div>
          <span class="demo-status">{activeCommand.status}</span>
        </div>
        <div class="command-meter" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="demo-body">
          <aside class="demo-sidebar">
            <span class="demo-sidebar-label">Files</span>
            <button class="demo-file active" type="button">roadmap.md</button>
            <button class="demo-file" type="button">research.typ</button>
            <button class="demo-file" type="button">quick/capture.md</button>
            <div class="demo-search">{activeCommand.search}</div>
          </aside>
          <div class="demo-editor">
            <div class="demo-toolbar">
              <span>{activeCommand.mode}</span>
              <span>{activeCommand.vault}</span>
            </div>
            <div class="demo-note-grid">
              <pre>{activeCommand.editor}</pre>
              <article class="demo-preview">
                <h3>{activeCommand.title}</h3>
                <p>{activeCommand.preview}</p>
              </article>
            </div>
          </div>
        </div>
      </div>

      <div class="keyboard-shell" role="group" aria-label="GitNotes shortcut keyboard">
        {#each keycaps as keycap}
          <button
            class="key"
            class:key-wide={keycap.wide}
            class:active={activeCommandName === keycap.command}
            type="button"
            aria-pressed={activeCommandName === keycap.command}
            onclick={() => setCommand(keycap.command)}
          >
            <span>{keycap.modifier}</span>
            <strong>{keycap.key}</strong>
            <em>{keycap.label}</em>
          </button>
        {/each}
      </div>
    </div>
  </div>
</section>
