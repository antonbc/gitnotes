import { autocompletion, type Completion, type CompletionContext } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import type { Ext } from "$lib/types";

type NoteCompletion = Completion & {
  previewLabel?: string;
};

type HeadingLevel = 1 | 2 | 3 | 4 | 5;

interface CommandSpec {
  label: string;
  detail: string;
  apply: string;
  sample: string;
  type?: string;
  aliases?: string[];
}

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

function headingSample(level: HeadingLevel) {
  return (
    {
      1: "Project title",
      2: "Section title",
      3: "Subsection title",
      4: "Detail title",
      5: "Small title",
    } satisfies Record<HeadingLevel, string>
  )[level];
}

function headingOption(level: HeadingLevel, ext: Ext): NoteCompletion {
  const marker = ext === "md" ? "#".repeat(level) : "=".repeat(level);
  const title = `Heading ${level}`;
  const sample = headingSample(level);

  return {
    label: `${marker} ${title}`,
    detail: ext === "md" ? `H${level}` : `Typst H${level}`,
    type: "keyword",
    apply: `${marker} `,
    boost: 100 - level,
    previewLabel: sample,
    info: () => preview(title, `${marker} ${sample}`, sample),
  };
}

function commandOption(spec: CommandSpec): NoteCompletion {
  return {
    label: spec.label,
    detail: spec.detail,
    type: spec.type ?? "keyword",
    apply: spec.apply,
    previewLabel: spec.sample,
    info: () => preview(spec.label, spec.apply.trimEnd(), spec.sample),
  };
}

function commandSpecs(ext: Ext): CommandSpec[] {
  const headingMarker = ext === "md" ? "#" : "=";
  const heading = (level: HeadingLevel): CommandSpec => ({
    label: `Heading ${level}`,
    detail: ext === "md" ? `H${level}` : `Typst H${level}`,
    apply: `${headingMarker.repeat(level)} `,
    sample: headingSample(level),
    aliases: [`h${level}`, "heading"],
  });

  if (ext === "md") {
    return [
      heading(1),
      heading(2),
      heading(3),
      heading(4),
      heading(5),
      { label: "Bullet list", detail: "- item", apply: "- ", sample: "List item", aliases: ["ul", "list"] },
      { label: "Numbered list", detail: "1. item", apply: "1. ", sample: "Step item", aliases: ["ol", "list"] },
      { label: "Task list", detail: "- [ ] task", apply: "- [ ] ", sample: "Task item", aliases: ["todo", "checkbox"] },
      { label: "Quote", detail: "> quote", apply: "> ", sample: "Quoted text", aliases: ["blockquote"] },
      { label: "Link", detail: "[text](url)", apply: "[text](url)", sample: "Clickable link", aliases: ["url"] },
      { label: "Image", detail: "![alt](path)", apply: "![alt](path)", sample: "Image embed", aliases: ["img", "picture"] },
      { label: "Inline code", detail: "`code`", apply: "`code`", sample: "Inline code", aliases: ["code"] },
      { label: "Code block", detail: "```lang", apply: "```lang\n\n```", sample: "Fenced code", aliases: ["fence"] },
      {
        label: "Table",
        detail: "GFM table",
        apply: "| Column 1 | Column 2 |\n| --- | --- |\n|  |  |",
        sample: "Two-column table",
        aliases: ["grid"],
      },
      { label: "Divider", detail: "---", apply: "---\n", sample: "Horizontal rule", aliases: ["hr", "rule"] },
      { label: "Math block", detail: "$$ ... $$", apply: "$$\n\n$$", sample: "Display math", aliases: ["equation"] },
    ];
  }

  return [
    heading(1),
    heading(2),
    heading(3),
    heading(4),
    heading(5),
    { label: "Bullet list", detail: "- item", apply: "- ", sample: "List item", aliases: ["ul", "list"] },
    { label: "Numbered list", detail: "+ item", apply: "+ ", sample: "Step item", aliases: ["ol", "list"] },
    { label: "Task list", detail: "- [ ] task", apply: "- [ ] ", sample: "Task item", aliases: ["todo", "checkbox"] },
    { label: "Quote", detail: "#quote[ ]", apply: "#quote[ ]", sample: "Quoted text", aliases: ["blockquote"] },
    { label: "Link", detail: "#link", apply: "#link(\"url\")[text]", sample: "Clickable link", aliases: ["url"] },
    { label: "Image", detail: "#image", apply: "#image(\"path\")", sample: "Image embed", aliases: ["img", "picture"] },
    { label: "Inline code", detail: "`code`", apply: "`code`", sample: "Inline code", aliases: ["code"] },
    { label: "Code block", detail: "```lang", apply: "```lang\n\n```", sample: "Fenced code", aliases: ["fence"] },
    {
      label: "Table",
      detail: "#table",
      apply: "#table(columns: 2)[ ][ ]",
      sample: "Two-column table",
      aliases: ["grid"],
    },
    { label: "Divider", detail: "#line", apply: "#line(length: 100%)", sample: "Horizontal rule", aliases: ["hr", "rule"] },
    { label: "Math block", detail: "$ ... $", apply: "$  $", sample: "Math expression", aliases: ["equation"] },
  ];
}

function matchesCommand(spec: CommandSpec, query: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  return [spec.label, spec.detail, ...(spec.aliases ?? [])].some((text) =>
    text.toLowerCase().includes(q)
  );
}

export function noteCompletionSource(ext: Ext) {
  return (context: CompletionContext) => {
    const line = context.state.doc.lineAt(context.pos);
    const before = context.state.sliceDoc(line.from, context.pos);
    const trigger = ext === "md" ? "#" : "=";
    const match = before.match(ext === "md" ? /^(\s*)(#{1,5})$/ : /^(\s*)(={1,5})$/);

    const slashMatch = before.match(/^(\s*)\/([\w-]*)$/);
    if (slashMatch) {
      const query = slashMatch[2] ?? "";
      const slashFrom = line.from + (slashMatch[1]?.length ?? 0);
      const options = commandSpecs(ext)
        .filter((spec) => matchesCommand(spec, query))
        .map(commandOption);

      return {
        from: slashFrom,
        to: context.pos,
        options,
        validFor: /^\/[\w-]*$/,
        filter: false,
      };
    }

    if (!match) return null;
    if (!context.explicit && !before.endsWith(trigger)) return null;

    const indent = match[1] ?? "";
    const markerFrom = line.from + indent.length;

    return {
      from: markerFrom,
      options: [
        headingOption(1, ext),
        headingOption(2, ext),
        headingOption(3, ext),
        headingOption(4, ext),
        headingOption(5, ext),
      ],
      validFor: ext === "md" ? /^#{0,5}$/ : /^={0,5}$/,
      filter: false,
    };
  };
}

export function noteCompletions(ext: Ext): Extension {
  return autocompletion({
    activateOnTyping: true,
    defaultKeymap: true,
    icons: false,
    interactionDelay: 0,
    maxRenderedOptions: 8,
    selectOnOpen: true,
    tooltipClass: () => "gn-completion-tooltip",
    optionClass: () => "gn-completion-option",
    addToOptions: [
      {
        position: 90,
        render(completion) {
          const sample = (completion as NoteCompletion).previewLabel;
          if (!sample) return null;
          const node = document.createElement("span");
          node.className = "gn-completion-option-sample";
          node.textContent = sample;
          return node;
        },
      },
    ],
    positionInfo(_view, list, _option, info, space) {
      const gap = 8;
      const right = list.right + gap;
      const infoWidth = info.right - info.left;
      if (right + infoWidth <= space.right) {
        return { style: `left:${right}px; top:${list.top}px` };
      }
      const left = list.left - infoWidth - gap;
      if (left >= space.left) {
        return { style: `left:${left}px; top:${list.top}px` };
      }
      return { style: `left:${list.left}px; top:${list.bottom + gap}px` };
    },
    override: [noteCompletionSource(ext)],
  });
}
