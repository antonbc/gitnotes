import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/**
 * Syntax colors driven by the `--syn-*` theme tokens from app.css so the
 * editor follows light/dark/oled theme switches live. The CodeMirror
 * `defaultHighlightStyle` ships fixed light-theme colors and made markdown
 * syntax unreadable on the dark themes.
 */
export const noteHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: "var(--syn-head)", fontWeight: "700" },
  { tag: tags.strong, color: "var(--syn-strong)", fontWeight: "700" },
  { tag: tags.emphasis, color: "var(--syn-em)", fontStyle: "italic" },
  { tag: tags.link, color: "var(--syn-link)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--syn-link)" },
  { tag: tags.monospace, color: "var(--syn-code)" },
  { tag: tags.strikethrough, color: "var(--text-faint)", textDecoration: "line-through" },
  { tag: tags.quote, color: "var(--syn-quote)", fontStyle: "italic" },
  { tag: tags.comment, color: "var(--syn-quote)", fontStyle: "italic" },
  { tag: tags.keyword, color: "var(--syn-func)" },
  { tag: tags.string, color: "var(--syn-string)" },
  { tag: tags.list, color: "var(--syn-list)" },
  { tag: tags.meta, color: "var(--syn-punct)" },
  { tag: tags.processingInstruction, color: "var(--syn-punct)" },
  { tag: tags.escape, color: "var(--syn-func)" },
  { tag: tags.contentSeparator, color: "var(--syn-punct)" },
]);
