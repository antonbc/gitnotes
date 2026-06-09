// Ported sample vault + appearance metadata from the prototype (data.jsx).

const FILE_INDEX = `# gitnotes

Local-first notes. Plain files. Yours forever.

**gitnotes** keeps every note as a plain \`.md\` or \`.typ\` file in a folder you
choose — your *vault*. No database, no lock-in, no server. Sync the whole vault
to *any* git remote you control.

## Why it exists

- Plain files on disk — open them in any editor, today or in ten years
- Vim motions for the keyboard crowd, a friendly toolbar for everyone else
- Search that stays instant, even across 10,000 notes
- One keystroke to commit and push

## Today

- [x] Wire up the filesystem watcher
- [x] Atomic writes (temp file + rename)
- [ ] Polish the conflict view
- [ ] Notarize and ship the \`.dmg\`

> Keyboard-first, mouse-optional. Your notes outlive the app.

Writes never touch a database — every save is atomic:

\`\`\`rust
fn atomic_write(path: &Path, data: &[u8]) -> Result<()> {
    let dir = path.parent().unwrap();
    let mut tmp = NamedTempFile::new_in(dir)?;
    tmp.write_all(data)?;
    tmp.flush()?;
    tmp.persist(path)?; // atomic rename over target
    Ok(())
}
\`\`\`

The energy of a note is roughly $E = mc^2$ — but that lives in the preview too:

$$ \\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2} $$

| Format | Highlight | Preview engine |
| --- | --- | --- |
| .md | lang-markdown | markdown-it + katex |
| .typ | StreamLanguage | typst-as-lib (in-process) |

See the [roadmap](2026-roadmap.md) for what's next.
`;

const FILE_ROADMAP = `# 2026 Roadmap

A short list. Ship the core, resist the scope creep.

## Now — v1
- [x] Vault + file tree + tabs
- [x] CodeMirror + Vim mode
- [ ] Typst compiled preview
- [ ] Git sync against any remote

## Next
- Full-text search at 10k notes
- Quick capture from anywhere

## Not now
Backlinks, wikilinks, a plugin system. *Later, maybe never.*

> One thousand no's for every yes.
`;

const FILE_READING = `# Reading list

Things worth a second pass.

1. *The Unix Programming Environment* — Kernighan & Pike
2. *A Philosophy of Software Design* — Ousterhout
3. *Thinking in Systems* — Meadows

## Quotes

> Simplicity is prerequisite for reliability.

- [ ] Re-read chapter 4
- [x] Take notes on \`deep modules\`
`;

const FILE_LETTER = `#set page(width: 16cm, height: auto, margin: 2cm)
#set text(font: "New Computer Modern", size: 11pt)
#set par(justify: true)

= Field Report
== Site 14 — North Ridge

#text(weight: "bold")[Summary.] The North Ridge traverse completed without
incident. Conditions held clear through the afternoon; visibility excellent
above the treeline.

Key figures from the day:

- Elevation gain: *1,240 m*
- Samples logged: *37*
- Temperature range: _-4°C to 6°C_

#image("ridge.png", width: 100%)

== Notes

The upper scree field is more unstable than the 2024 survey suggested. Flagging
for re-assessment before the spring rotation.

#quote[Measure twice. The mountain does not round up.]

#link("https://example.org/site-14")[Full dataset →]
`;

const FILE_STANDUP = `# Standup — Mon

- Shipped atomic writes
- Reviewing the watcher debounce
- Blocked on: nothing

## Notes
Conflict view needs a real three-way merge eventually.
`;

const FILE_IDEA = `# Idea — capture from anywhere

Global hotkey -> tiny window -> type -> lands in \`quick/\`.
No vault picker, no friction. Commit on close.
`;

const FILE_ARCHIVE = `# Old spec (v0)

Superseded. Kept for reference only.
`;

export function createVault() {
  return {
    name: "field-notes",
    files: {
      "index.md": { name: "index.md", ext: "md", group: "root", content: FILE_INDEX },
      "2026-roadmap.md": { name: "2026-roadmap.md", ext: "md", group: "root", content: FILE_ROADMAP },
      "letter.typ": { name: "letter.typ", ext: "typ", group: "root", content: FILE_LETTER },
      "reading-list.md": { name: "reading-list.md", ext: "md", group: "root", content: FILE_READING },
      "quick/standup.md": { name: "standup.md", ext: "md", group: "quick", content: FILE_STANDUP },
      "quick/idea.md": { name: "idea.md", ext: "md", group: "quick", content: FILE_IDEA },
      ".archive/old-spec.md": { name: "old-spec.md", ext: "md", group: "archive", content: FILE_ARCHIVE },
    },
    groups: [
      { id: "root", label: "field-notes", paths: ["index.md", "2026-roadmap.md", "letter.typ", "reading-list.md"] },
      { id: "quick", label: "quick", paths: ["quick/standup.md", "quick/idea.md"] },
      { id: "archive", label: ".archive", paths: [".archive/old-spec.md"], muted: true },
    ],
  };
}

export const THEMES = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  { id: "oled", name: "Pure Black" },
];

export const FONTS = [
  { id: "mono", glyph: "M", name: "Monospace", desc: "JetBrains Mono — code & structure" },
  { id: "sans", glyph: "A", name: "Sans", desc: "System — clean & neutral" },
  { id: "serif", glyph: "S", name: "Serif", desc: "Charter — for reading prose" },
];

export const COMMANDS = [
  { id: "split", title: "View: Split", hint: "⌘\\", icon: "split", group: "View" },
  { id: "edit", title: "View: Editor only", hint: "", icon: "edit", group: "View" },
  { id: "preview", title: "View: Preview only", hint: "", icon: "eye", group: "View" },
  { id: "vim", title: "Toggle Vim mode", hint: "", icon: "vim", group: "Editor" },
  { id: "theme", title: "Appearance: cycle theme", hint: "", icon: "moon", group: "Appearance" },
  { id: "font", title: "Appearance: cycle editor font", hint: "", icon: "type", group: "Appearance" },
  { id: "newfile", title: "New note", hint: "⌘N", icon: "plus", group: "File" },
  { id: "savedisk", title: "Save to disk", hint: "⌘S", icon: "doc", group: "Save & Sync" },
  { id: "sync", title: "Commit & push to GitHub", hint: "⇧⌘S", icon: "push", group: "Save & Sync" },
  { id: "syncboth", title: "Sync (pull, then push)", hint: "", icon: "sync", group: "Save & Sync" },
  { id: "pull", title: "Pull from origin/main", hint: "", icon: "pull", group: "Save & Sync" },
  { id: "autosave", title: "Toggle auto-save", hint: "", icon: "check", group: "Save & Sync" },
  { id: "conflict", title: "Review merge conflict", hint: "", icon: "merge", group: "Save & Sync" },
  { id: "reveal", title: "Reveal in Finder", hint: "", icon: "finder", group: "File" },
];

export const CONFLICT = {
  path: "2026-roadmap.md",
  ours: [
    { x: "## Now — v1" },
    { x: "- [x] Vault + file tree + tabs" },
    { x: "- [x] CodeMirror + Vim mode" },
    { x: "- [ ] Typst compiled preview", t: "del" },
    { x: "- [ ] Git sync against any remote", t: "del" },
  ],
  theirs: [
    { x: "## Now — v1" },
    { x: "- [x] Vault + file tree + tabs" },
    { x: "- [x] CodeMirror + Vim mode" },
    { x: "- [x] Typst compiled preview", t: "add" },
    { x: "- [ ] Git sync (any remote)", t: "add" },
    { x: "- [ ] Notarize the .dmg", t: "add" },
  ],
};

export function firstLine(s) {
  for (const l of s.split("\n")) {
    const t = l.replace(/^#+\s*/, "").replace(/[*_`>#-]/g, "").trim();
    if (t) return t;
  }
  return "";
}
