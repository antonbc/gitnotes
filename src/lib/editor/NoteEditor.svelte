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
  import type { Ext, FormatAction } from "$lib/types";
  import { typstLanguage } from "$lib/editor/typstLanguage";
  import { formatSpec } from "$lib/editor/formatting";
  import { noteCompletions } from "$lib/editor/completions";

  let {
    content,
    ext,
    vimMode,
    onChange,
    onSave,
    onBlur
  }: {
    content: string;
    ext: Ext;
    vimMode: boolean;
    onChange: (content: string) => void;
    onSave: () => void | Promise<void>;
    onBlur: () => void | Promise<void>;
  } = $props();

  let host: HTMLDivElement;
  let view: EditorView | null = null;
  const language = new Compartment();
  const completions = new Compartment();
  const vimCompartment = new Compartment();
  let applyingExternalContent = false;

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
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          language.of(ext === "md" ? markdown() : typstLanguage),
          completions.of(noteCompletions(ext)),
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
          placeholder("Start writing..."),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !applyingExternalContent) {
              onChange(update.state.doc.toString());
            }
          }),
          EditorView.domEventHandlers({
            blur: () => {
              void onBlur();
              return false;
            }
          })
        ]
      })
    });
  });

  onDestroy(() => {
    if (vimWriteHandler === onSave) vimWriteHandler = null;
    view?.destroy();
  });

  $effect(() => {
    vimWriteHandler = onSave;
  });

  $effect(() => {
    if (!view) return;
    const next = content;
    const current = view.state.doc.toString();
    if (next !== current) {
      applyingExternalContent = true;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: next }
      });
      applyingExternalContent = false;
    }
  });

  $effect(() => {
    if (!view) return;
    view.dispatch({
      effects: language.reconfigure(ext === "md" ? markdown() : typstLanguage)
    });
  });

  $effect(() => {
    if (!view) return;
    view.dispatch({
      effects: completions.reconfigure(noteCompletions(ext))
    });
  });

  $effect(() => {
    if (!view) return;
    view.dispatch({
      effects: vimCompartment.reconfigure(vimMode ? vim({ status: true }) : [])
    });
  });

  export function focus() {
    view?.focus();
  }

  export function format(action: FormatAction) {
    if (!view) return;
    const spec = formatSpec(action, ext);
    const state = view.state;
    const changes = state.changeByRange((range) => {
      const selected = state.sliceDoc(range.from, range.to);
      if (spec.linePrefix) {
        const line = state.doc.lineAt(range.from);
        return {
          changes: { from: line.from, insert: spec.linePrefix },
          range: EditorSelection.cursor(range.to + spec.linePrefix.length)
        };
      }
      if (spec.block) {
        const insert = selected ? spec.block.replace("text", selected) : spec.block;
        return {
          changes: { from: range.from, to: range.to, insert },
          range: EditorSelection.cursor(range.from + insert.length)
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
        )
      };
    });
    view.dispatch(changes);
    view.focus();
  }
</script>

<div class="editor" bind:this={host}></div>

<style>
  .editor {
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: #ffffff;
  }

  :global(.cm-editor) {
    height: 100%;
    font-size: 14px;
  }

  :global(.cm-scroller) {
    font-family: "SFMono-Regular", ui-monospace, Menlo, Consolas, monospace;
    line-height: 1.58;
  }

  :global(.cm-focused) {
    outline: none;
  }

  :global(.cm-gutters) {
    background: #f3f6f5;
    color: #65706d;
    border-right: 1px solid #cbd4d1;
  }

  :global(.cm-tooltip-autocomplete) {
    overflow: hidden;
    border: 1px solid #cbd4d1;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.18);
    color: #17201f;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
    background: #e8f3f1;
    color: #17201f;
  }

  :global(.cm-completionLabel) {
    font-family: "SFMono-Regular", ui-monospace, Menlo, Consolas, monospace;
    font-size: 12px;
  }

  :global(.cm-completionDetail) {
    color: #65706d;
    font-size: 11px;
  }

  :global(.cm-tooltip.cm-completionInfo) {
    border: 1px solid #cbd4d1;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.16);
    color: #17201f;
  }

  :global(.gn-completion-info) {
    display: grid;
    gap: 8px;
    width: 190px;
    padding: 10px;
  }

  :global(.gn-completion-info-title) {
    color: #65706d;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  :global(.gn-completion-info code) {
    display: block;
    padding: 6px;
    border-radius: 5px;
    background: #f3f6f5;
    color: #17201f;
    font-family: "SFMono-Regular", ui-monospace, Menlo, Consolas, monospace;
    font-size: 12px;
    white-space: pre-wrap;
  }

  :global(.gn-completion-info-preview) {
    padding: 8px 0 2px;
    border-top: 1px solid #cbd4d1;
    font-size: 18px;
    font-weight: 700;
  }
</style>
