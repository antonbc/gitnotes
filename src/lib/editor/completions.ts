import { autocompletion, type Completion, type CompletionContext } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import type { Ext } from "$lib/types";

function preview(title: string, syntax: string, sample: string) {
  const wrap = document.createElement("div");
  wrap.className = "gn-completion-info";

  const heading = document.createElement("div");
  heading.className = "gn-completion-info-title";
  heading.textContent = title;

  const code = document.createElement("code");
  code.textContent = syntax;

  const rendered = document.createElement("div");
  rendered.className = "gn-completion-info-preview";
  rendered.textContent = sample;

  wrap.append(heading, code, rendered);
  return wrap;
}

function headingOption(level: 1 | 2 | 3, ext: Ext): Completion {
  const marker = ext === "md" ? "#".repeat(level) : "=".repeat(level);
  const title = `Heading ${level}`;
  const sample = level === 1 ? "Project title" : level === 2 ? "Section title" : "Subsection title";

  return {
    label: `${marker} ${title}`,
    detail: ext === "md" ? `H${level}` : `Typst H${level}`,
    type: "keyword",
    apply: `${marker} `,
    info: () => preview(title, `${marker} ${sample}`, sample),
  };
}

export function noteCompletionSource(ext: Ext) {
  return (context: CompletionContext) => {
    const line = context.state.doc.lineAt(context.pos);
    const before = context.state.sliceDoc(line.from, context.pos);
    const trigger = ext === "md" ? "#" : "=";
    const match = before.match(ext === "md" ? /^(\s*)(#{1,3})$/ : /^(\s*)(={1,3})$/);

    if (!match) return null;
    if (!context.explicit && !before.endsWith(trigger)) return null;

    const indent = match[1] ?? "";
    const markerFrom = line.from + indent.length;

    return {
      from: markerFrom,
      options: [headingOption(1, ext), headingOption(2, ext), headingOption(3, ext)],
      validFor: ext === "md" ? /^#{0,3}$/ : /^={0,3}$/,
    };
  };
}

export function noteCompletions(ext: Ext): Extension {
  return autocompletion({
    activateOnTyping: true,
    defaultKeymap: true,
    icons: false,
    maxRenderedOptions: 8,
    override: [noteCompletionSource(ext)],
  });
}
