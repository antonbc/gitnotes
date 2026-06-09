import iconUrl from "../../assets/icon.png";

export { iconUrl };

export const downloadUrl =
  "https://github.com/antonbc/gitnotes/releases/latest/download/GitNotes-aarch64.dmg";
export const releasesUrl = "https://github.com/antonbc/gitnotes/releases";
export const githubUrl = "https://github.com/antonbc/gitnotes";
export const licenseUrl = "https://github.com/antonbc/gitnotes/blob/main/LICENSE";

export const features = [
  {
    title: "Plain vaults",
    tone: "teal",
    kicker: "Readable anywhere",
    description:
      "Markdown and Typst stay as ordinary files in a folder you choose, ready for any editor.",
  },
  {
    title: "Split writing",
    tone: "blue",
    kicker: "Editor plus preview",
    description:
      "Write with CodeMirror controls, keep Typst or Markdown preview open, and move quickly.",
  },
  {
    title: "Git-aware sync",
    tone: "gold",
    kicker: "No account layer",
    description:
      "Pull, resolve conflicts, commit, and push to any remote reachable by the system Git CLI.",
  },
];

export const stats = [
  { value: ".md", label: "Markdown notes" },
  { value: ".typ", label: "Typst notes" },
  { value: "Git", label: "Remote sync" },
  { value: "FTS5", label: "Local search" },
];

export const commands = {
  palette: {
    status: "Palette opened",
    mode: "Command palette",
    vault: "field-notes",
    search: "Run a command or jump to a note…",
    title: "Command palette",
    editor: `> Save to disk            ⌘S
> Commit & push           ⇧⌘S
> View: Split             ⌘\\
> New note                ⌘N
> Toggle Vim mode`,
    preview:
      "Jump between files, create notes, and trigger editor actions without reaching for the mouse.",
  },
  search: {
    status: "4 matches",
    mode: "Fuzzy finder",
    vault: "field-notes",
    search: "Find a note by name…",
    title: "Fuzzy finder",
    editor: `2026-roadmap.md
  Ship the core, resist scope creep.

reading-list.md
  Things worth a second pass.

quick/standup.md
  Shipped atomic writes`,
    preview: "Find anything in the vault, then open the matching note directly in the editor.",
  },
  save: {
    status: "Saved to disk",
    mode: "Split",
    vault: "field-notes",
    search: "No unsaved changes",
    title: "2026 Roadmap",
    editor: `# 2026 Roadmap

Ship the core, resist the scope creep.

## Now — v1
- [x] Vault + file tree + tabs
- [x] CodeMirror + Vim mode
- [ ] Typst compiled preview`,
    preview:
      "Auto-save keeps writing low-friction, while ⌘S gives a reassuring manual checkpoint.",
  },
  sidebar: {
    status: "Sidebar hidden",
    mode: "Split",
    vault: "field-notes",
    search: "Search notes…",
    title: "Focus mode",
    editor: `# Field Notes

The sidebar is tucked away so the
editor and preview can breathe.

- ⌘\\ toggles the file tree
- ⌘K opens the command palette
- ⌘2 switches to split view`,
    preview: "Toggle the sidebar with ⌘\\ to jump between notes and stay in the flow.",
  },
  sync: {
    status: "Pushed to origin/main",
    mode: "Git sync",
    vault: "main · in sync",
    search: "Clean working tree",
    title: "Commit & push",
    editor: `Branch: main
Ahead: 0  Behind: 0
Changed: clean

Last commit:
Polish the conflict view`,
    preview:
      "Pull, resolve conflicts, commit, and push to any remote your system Git CLI can reach.",
  },
};

export const keycaps = [
  { command: "palette", modifier: "⌘", key: "K", label: "Palette", wide: true },
  { command: "search", modifier: "⌘", key: "P", label: "Finder" },
  { command: "save", modifier: "⌘", key: "S", label: "Save" },
  { command: "sidebar", modifier: "⌘", key: "\\", label: "Sidebar" },
  { command: "sync", modifier: "⇧⌘", key: "S", label: "Commit", wide: true },
];

// Resolve a keydown to a command. ⌘S saves, ⇧⌘S commits & pushes.
export function resolveShortcut(event) {
  if (!(event.metaKey || event.ctrlKey)) return null;
  const key = event.key.toLowerCase();
  if (key === "k") return "palette";
  if (key === "p") return "search";
  if (key === "\\") return "sidebar";
  if (key === "s") return event.shiftKey ? "sync" : "save";
  return null;
}
