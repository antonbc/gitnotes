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
  if (state.src[state.pos] !== "$" || state.src[state.pos + 1] === "$") return false;
  const end = state.src.indexOf("$", state.pos + 1);
  if (end < 0) return false;
  if (!silent) {
    const token = state.push("math_inline", "math", 0);
    token.content = state.src.slice(state.pos + 1, end);
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

export function renderMarkdown(content: string): string {
  return md.render(content);
}
