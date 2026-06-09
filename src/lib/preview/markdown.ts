import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import katex from "katex";
import "katex/dist/katex.min.css";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
})
  .enable(["table", "strikethrough"])
  .use(taskLists, { enabled: true });

md.inline.ruler.before("escape", "math_inline", (state: any, silent: boolean) => {
  const src: string = state.src;
  const start: number = state.pos;
  if (src[start] !== "$" || src[start + 1] === "$") return false;
  // The opening '$' must be followed by a non-space, and the closing '$' must
  // not be preceded by a space nor followed by a digit. This keeps real inline
  // math working while leaving prose like "it cost $5 and $10" untouched
  // (a stray '$' no longer swallows everything up to the next '$').
  const afterOpen = src[start + 1];
  if (afterOpen === undefined || /\s/.test(afterOpen)) return false;

  let end = -1;
  let scan = start + 1;
  while (scan < src.length) {
    const idx = src.indexOf("$", scan);
    if (idx < 0) break;
    const before = src[idx - 1];
    const after = src[idx + 1] ?? "";
    if (before !== undefined && !/\s/.test(before) && !/\d/.test(after)) {
      end = idx;
      break;
    }
    scan = idx + 1;
  }
  if (end < 0) return false;

  if (!silent) {
    const token = state.push("math_inline", "math", 0);
    token.content = src.slice(start + 1, end);
  }
  state.pos = end + 1;
  return true;
});

md.block.ruler.before("fence", "math_block", (state: any, start: number, end: number, silent: boolean) => {
  const first = state.getLines(start, start + 1, 0, false).trim();
  if (first !== "$$") return false;
  let next = start + 1;
  while (next < end) {
    if (state.getLines(next, next + 1, 0, false).trim() === "$$") break;
    next += 1;
  }
  if (next >= end) return false;
  if (!silent) {
    const token = state.push("math_block", "math", 0);
    token.block = true;
    token.content = state.getLines(start + 1, next, 0, false);
    token.map = [start, next];
  }
  state.line = next + 1;
  return true;
});

md.renderer.rules.math_inline = (tokens: any[], idx: number) =>
  katex.renderToString(tokens[idx].content, {
    throwOnError: false,
    displayMode: false
  });

md.renderer.rules.math_block = (tokens: any[], idx: number) =>
  `<div class="math-block">${katex.renderToString(tokens[idx].content, {
    throwOnError: false,
    displayMode: true
  })}</div>`;

function normalizeLooseMarkdownHeadings(content: string): string {
  let fencedBy: "`" | "~" | null = null;
  let inMathBlock = false;

  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      const fence = trimmed.match(/^(```+|~~~+)/)?.[1];

      if (fence) {
        const marker = fence[0] as "`" | "~";
        // A fence is only closed by its own marker. A different marker appearing
        // inside an open fence (e.g. a "~~~" line inside a ``` block) is literal
        // content and must not flip the fence state.
        if (fencedBy === null) {
          fencedBy = marker;
        } else if (fencedBy === marker) {
          fencedBy = null;
        }
        return line;
      }

      if (!fencedBy && trimmed.trim() === "$$") {
        inMathBlock = !inMathBlock;
        return line;
      }

      if (fencedBy || inMathBlock) return line;
      return line.replace(/^(\s{0,3})(#{1,6})([^\s#].*)$/, "$1$2 $3");
    })
    .join("\n");
}

export function renderMarkdown(content: string): string {
  return md.render(normalizeLooseMarkdownHeadings(content));
}
