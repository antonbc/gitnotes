<script lang="ts" module>
  import { Vim } from "@replit/codemirror-vim";

  let vimWriteHandler: (() => void | Promise<void>) | null = null;
  let vimWriteRegistered = false;

  function registerWriteCommand() {
    if (vimWriteRegistered) return;
    Vim.defineEx("write", "w", () => {
      void vimWriteHandler?.();
    });
    vimWriteRegistered = true;
  }
</script>

<script lang="ts">
  import { markdown } from "@codemirror/lang-markdown";
  import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
  import { bracketMatching, foldGutter, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
  import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
  import { Compartment, EditorSelection, EditorState } from "@codemirror/state";
  import { EditorView, keymap, lineNumbers, placeholder } from "@codemirror/view";
  import { vim } from "@replit/codemirror-vim";
  import { onDestroy, onMount } from "svelte";
  import type { EditorMetrics, Ext, FormatAction } from "$lib/types";
  import { typstLanguage } from "$lib/editor/typstLanguage";
  import { formatSpec } from "$lib/editor/formatting";
  import { noteCompletions } from "$lib/editor/completions";

  const gitNotesEditorTheme = EditorView.theme({
    "&": {
      height: "100%",
      backgroundColor: "var(--bg-editor)",
      color: "var(--text)",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-editor)",
      fontSize: "var(--editor-size, 13px)",
      lineHeight: "var(--editor-lh, 1.7)",
      letterSpacing: "var(--editor-track, 0)",
      color: "var(--text)",
      backgroundColor: "var(--bg-editor)",
    },
    ".cm-content": {
      color: "var(--text)",
      caretColor: "var(--accent)",
    },
    ".cm-line": {
      color: "var(--text)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--bg-editor) !important",
      color: "var(--text-faint) !important",
      borderRight: "1px solid var(--border-subtle)",
    },
    ".cm-gutter": {
      backgroundColor: "var(--bg-editor) !important",
    },
    ".cm-gutterElement": {
      color: "var(--text-faint) !important",
      backgroundColor: "transparent !important",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      minWidth: "2.5ch",
      padding: "0 12px 0 10px",
      color: "var(--text-muted) !important",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--editor-size, 13px)",
    },
    ".cm-activeLineGutter, .cm-activeLine": {
      backgroundColor: "var(--bg-hover) !important",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--accent) !important",
    },
    ".cm-selectionBackground": {
      backgroundColor: "var(--accent-subtle) !important",
    },
    ".cm-tooltip": {
      fontFamily: "var(--font-ui)",
      color: "var(--text)",
      backgroundColor: "var(--bg-elevated)",
      borderColor: "var(--border)",
    },
    ".cm-tooltip.cm-tooltip-autocomplete": {
      overflow: "hidden",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      backgroundColor: "var(--bg-elevated)",
      color: "var(--text)",
      boxShadow: "0 14px 36px rgba(0, 0, 0, 0.28)",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul": {
      minWidth: "280px",
      maxHeight: "280px",
      padding: "4px",
    },
    ".cm-tooltip.cm-tooltip-autocomplete li": {
      display: "grid",
      gridTemplateColumns: "max-content 1fr max-content",
      alignItems: "baseline",
      columnGap: "10px",
      minHeight: "34px",
      padding: "6px 8px",
      borderRadius: "5px",
      color: "var(--text) !important",
      backgroundColor: "transparent",
    },
    ".cm-tooltip.cm-tooltip-autocomplete li[aria-selected=\"true\"]": {
      backgroundColor: "var(--accent-subtle) !important",
      color: "var(--text) !important",
    },
    ".cm-completionLabel": {
      color: "var(--text) !important",
      fontFamily: "var(--font-editor)",
      fontSize: "12px",
      fontWeight: "650",
    },
    ".cm-completionMatchedText": {
      color: "var(--accent) !important",
      textDecoration: "none",
      fontWeight: "800",
    },
    ".cm-completionDetail": {
      color: "var(--text-faint) !important",
      fontSize: "11px",
      marginLeft: "0",
    },
    ".gn-completion-option-sample": {
      color: "var(--text-muted)",
      fontSize: "11px",
      justifySelf: "end",
      whiteSpace: "nowrap",
    },
    ".cm-tooltip.cm-completionInfo": {
      border: "1px solid var(--border)",
      borderRadius: "8px",
      backgroundColor: "var(--bg-elevated)",
      color: "var(--text)",
      boxShadow: "0 14px 36px rgba(0, 0, 0, 0.28)",
    },
  });

  let {
    content,
    ext,
    vimMode,
    onChange,
    onMetrics,
    onSave,
    onBlur,
  }: {
    content: string;
    ext: Ext;
    vimMode: boolean;
    onChange: (content: string) => void;
    onMetrics: (metrics: EditorMetrics) => void;
    onSave: () => void | Promise<void>;
    onBlur: () => void | Promise<void>;
  } = $props();

  let host: HTMLDivElement;
  let view: EditorView | null = null;
  const language = new Compartment();
  const completions = new Compartment();
  const vimCompartment = new Compartment();
  let applyingExternalContent = false;

  interface HeadingSpaceFix {
    from: number;
    head: number;
    lineNumber: number;
    lineText: string;
  }

  function wordCount(text: string) {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  function looseHeadingSpaceFix(state: EditorState, currentExt: Ext): HeadingSpaceFix | null {
    const main = state.selection.main;
    if (!main.empty) return null;

    const line = state.doc.lineAt(main.head);
    const match =
      currentExt === "md"
        ? line.text.match(/^(\s{0,3})(#{1,6})([^\s#].*)$/)
        : line.text.match(/^(\s*)(={1,6})([^\s=].*)$/);
    if (!match) return null;

    const markerStart = line.from + (match[1]?.length ?? 0);
    const markerEnd = markerStart + match[2].length;
    if (main.head <= markerEnd) return null;

    return {
      from: markerEnd,
      head: main.head,
      lineNumber: line.number,
      lineText: line.text,
    };
  }

  function queueLooseHeadingSpaceFix(fix: HeadingSpaceFix | null) {
    if (!fix) return;
    queueMicrotask(() => {
      if (!view) return;
      const line = view.state.doc.line(fix.lineNumber);
      if (line.text !== fix.lineText) return;
      view.dispatch({
        changes: { from: fix.from, insert: " " },
        selection: EditorSelection.cursor(fix.head + 1),
      });
    });
  }

  function readMetrics(state: EditorState): EditorMetrics {
    const main = state.selection.main;
    const line = state.doc.lineAt(main.head);
    const selectionChars = state.selection.ranges.reduce(
      (total, range) => total + Math.abs(range.to - range.from),
      0
    );
    const selectionRanges = state.selection.ranges.filter((range) => !range.empty).length;
    const text = state.doc.toString();

    return {
      cursor: { ln: line.number, col: main.head - line.from + 1 },
      selection: { chars: selectionChars, ranges: selectionRanges },
      lineCount: state.doc.lines,
      wordCount: wordCount(text),
      charCount: text.length,
    };
  }

  function reportMetrics(state: EditorState) {
    onMetrics(readMetrics(state));
  }

  function formatCommand(action: FormatAction) {
    return () => {
      format(action);
      return true;
    };
  }

  const formattingKeymap = [
    { key: "Mod-b", run: formatCommand("bold") },
    { key: "Mod-i", run: formatCommand("italic") },
    { key: "Mod-Alt-1", run: formatCommand("heading1") },
    { key: "Mod-Alt-2", run: formatCommand("heading2") },
    { key: "Mod-Shift-8", run: formatCommand("bullet") },
    { key: "Mod-Shift-7", run: formatCommand("numbered") },
    { key: "Mod-Shift-x", run: formatCommand("task") },
    { key: "Mod-Shift-k", run: formatCommand("link") },
    { key: "Mod-e", run: formatCommand("inlineCode") },
    { key: "Mod-Shift-e", run: formatCommand("codeBlock") },
  ];

  onMount(() => {
    registerWriteCommand();
    vimWriteHandler = onSave;

    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: content,
        extensions: [
          vimCompartment.of(vimMode ? vim({ status: true }) : []),
          lineNumbers(),
          foldGutter(),
          history(),
          bracketMatching(),
          highlightSelectionMatches(),
          gitNotesEditorTheme,
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          language.of(ext === "md" ? markdown() : typstLanguage),
          completions.of(noteCompletions(ext)),
          keymap.of([
            ...formattingKeymap,
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap
          ]),
          placeholder("Start writing…"),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !applyingExternalContent) {
              onChange(update.state.doc.toString());
              queueLooseHeadingSpaceFix(looseHeadingSpaceFix(update.state, ext));
            }
            if (update.docChanged || update.selectionSet) {
              reportMetrics(update.state);
            }
          }),
          EditorView.domEventHandlers({
            blur: () => {
              void onBlur();
              return false;
            },
          }),
        ],
      }),
    });
    reportMetrics(view.state);
  });

  onDestroy(() => {
    if (vimWriteHandler === onSave) vimWriteHandler = null;
    view?.destroy();
  });

  $effect(() => { vimWriteHandler = onSave; });

  $effect(() => {
    if (!view) return;
    const next = content;
    const current = view.state.doc.toString();
    if (next !== current) {
      applyingExternalContent = true;
      view.dispatch({ changes: { from: 0, to: current.length, insert: next } });
      applyingExternalContent = false;
      reportMetrics(view.state);
    }
  });

  $effect(() => {
    if (!view) return;
    view.dispatch({ effects: language.reconfigure(ext === "md" ? markdown() : typstLanguage) });
  });

  $effect(() => {
    if (!view) return;
    view.dispatch({ effects: completions.reconfigure(noteCompletions(ext)) });
  });

  $effect(() => {
    if (!view) return;
    view.dispatch({ effects: vimCompartment.reconfigure(vimMode ? vim({ status: true }) : []) });
  });

  export function focus() { view?.focus(); }

  export function format(action: FormatAction) {
    if (!view) return;
    const spec = formatSpec(action, ext);
    const state = view.state;
    const changes = state.changeByRange((range) => {
      const selected = state.sliceDoc(range.from, range.to);
      if (spec.linePrefix) {
        const fromLine = state.doc.lineAt(range.from);
        const toLine = state.doc.lineAt(range.to);
        const changes: { from: number; insert: string }[] = [];
        for (let lineNumber = fromLine.number; lineNumber <= toLine.number; lineNumber += 1) {
          const line = state.doc.line(lineNumber);
          if (line.from === range.to && !range.empty) continue;
          changes.push({ from: line.from, insert: spec.linePrefix });
        }
        const inserted = changes.length * spec.linePrefix.length;
        return {
          changes,
          range: range.empty
            ? EditorSelection.cursor(range.to + spec.linePrefix.length)
            : EditorSelection.range(range.from + spec.linePrefix.length, range.to + inserted),
        };
      }
      if (spec.block) {
        const insert = selected ? spec.block.replace("text", selected) : spec.block;
        return {
          changes: { from: range.from, to: range.to, insert },
          range: EditorSelection.cursor(range.from + insert.length),
        };
      }
      const fallback = spec.placeholder ?? "";
      const inner = selected || fallback;
      const insert = `${spec.prefix ?? ""}${inner}${spec.suffix ?? ""}`;
      return {
        changes: { from: range.from, to: range.to, insert },
        range: EditorSelection.range(
          range.from + (spec.prefix?.length ?? 0),
          range.from + (spec.prefix?.length ?? 0) + inner.length
        ),
      };
    });
    view.dispatch(changes);
    view.focus();
  }
</script>

<div class="h-full min-h-0 overflow-hidden bg-bg-editor" bind:this={host}></div>

<style>
  :global(.cm-editor) {
    height: 100%;
    background: var(--bg-editor);
  }

  :global(.cm-scroller) {
    font-family: var(--font-editor);
    font-size: var(--editor-size, 13px);
    line-height: var(--editor-lh, 1.7);
    letter-spacing: var(--editor-track, 0);
    color: var(--text);
  }

  :global(.cm-focused) { outline: none; }

  :global(.cm-gutters) {
    background: var(--bg-editor);
    color: var(--text-faint);
    border-right: 1px solid var(--border-subtle);
  }

  :global(.cm-activeLineGutter),
  :global(.cm-activeLine) {
    background: var(--bg-hover) !important;
  }

  :global(.cm-cursor) {
    border-left-color: var(--accent) !important;
  }

  :global(.cm-selectionBackground) {
    background: var(--accent-subtle) !important;
  }

  :global(.cm-vim-panel) {
    background: var(--bg-topbar);
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    padding: 2px 8px;
    font-size: 12px;
  }

  :global(.cm-searchMatch) {
    background: var(--accent-subtle);
    border-radius: 2px;
  }

  :global(.cm-searchMatch.cm-searchMatch-selected) {
    background: var(--accent);
    color: #fff;
  }

  :global(.cm-tooltip-autocomplete) {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-elevated);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.18);
    color: var(--text);
    font-family: var(--font-ui);
  }

  :global(.cm-tooltip-autocomplete ul) {
    min-width: 220px;
    max-height: 260px;
    padding: 4px;
  }

  :global(.cm-tooltip-autocomplete li) {
    border-radius: 5px;
    padding: 5px 8px;
  }

  :global(.cm-tooltip-autocomplete li[aria-selected]) {
    background: var(--accent-subtle);
    color: var(--text);
  }

  :global(.cm-completionLabel) {
    font-family: var(--font-editor);
    font-size: 12px;
  }

  :global(.cm-completionDetail) {
    color: var(--text-faint);
    font-size: 11px;
  }

  :global(.cm-tooltip.cm-completionInfo) {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-elevated);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.16);
    color: var(--text);
  }

  :global(.gn-completion-info) {
    display: grid;
    gap: 8px;
    width: 190px;
    padding: 10px;
  }

  :global(.gn-completion-info-title) {
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  :global(.gn-completion-info code) {
    display: block;
    padding: 6px;
    border-radius: 5px;
    background: var(--bg-hover);
    color: var(--text);
    font-family: var(--font-editor);
    font-size: 12px;
    white-space: pre-wrap;
  }

  :global(.gn-completion-info-preview) {
    padding: 8px 0 2px;
    border-top: 1px solid var(--border-subtle);
    font-size: 18px;
    font-weight: 700;
  }
</style>
