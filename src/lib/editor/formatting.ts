import type { Ext, FormatAction } from "$lib/types";

interface FormatSpec {
  prefix?: string;
  suffix?: string;
  block?: string;
  linePrefix?: string;
  placeholder?: string;
}

export function formatSpec(action: FormatAction, ext: Ext): FormatSpec {
  const x = "text";
  const url = "url";
  const path = "path";
  const lang = "lang";

  if (ext === "md") {
    return {
      bold: { prefix: "**", suffix: "**", placeholder: x },
      italic: { prefix: "*", suffix: "*", placeholder: x },
      heading1: { linePrefix: "# " },
      heading2: { linePrefix: "## " },
      bullet: { linePrefix: "- " },
      numbered: { linePrefix: "1. " },
      task: { linePrefix: "- [ ] " },
      link: { block: `[${x}](${url})` },
      image: { block: `![alt](${path})` },
      inlineCode: { prefix: "`", suffix: "`", placeholder: x },
      codeBlock: { block: `\`\`\`${lang}\n\n\`\`\`` },
      quote: { linePrefix: "> " },
      table: { block: "| Column 1 | Column 2 |\n| --- | --- |\n|  |  |" }
    }[action];
  }

  return {
    bold: { prefix: "*", suffix: "*", placeholder: x },
    italic: { prefix: "_", suffix: "_", placeholder: x },
    heading1: { linePrefix: "= " },
    heading2: { linePrefix: "== " },
    bullet: { linePrefix: "- " },
    numbered: { linePrefix: "+ " },
    task: { linePrefix: "- [ ] " },
    link: { block: `#link("${url}")[${x}]` },
    image: { block: `#image("${path}")` },
    inlineCode: { prefix: "`", suffix: "`", placeholder: x },
    codeBlock: { block: `\`\`\`${lang}\n\n\`\`\`` },
    quote: { block: "#quote[ ]" },
    table: { block: "#table(columns: 2)[ ][ ]" }
  }[action];
}
