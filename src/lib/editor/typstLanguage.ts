import { StreamLanguage } from "@codemirror/language";

export const typstLanguage = StreamLanguage.define({
  name: "typst",
  token(stream) {
    if (stream.sol() && stream.match(/={1,6}\s.*/)) return "heading";
    if (stream.match(/#[-\w]+/)) return "keyword";
    if (stream.match(/`[^`]*`/)) return "monospace";
    if (stream.match(/\*[^*]+\*/)) return "strong";
    if (stream.match(/_[^_]+_/)) return "emphasis";
    if (stream.match(/\/\/.*/)) return "comment";
    if (stream.match(/"([^"\\]|\\.)*"/)) return "string";
    stream.next();
    return null;
  },
  languageData: {
    commentTokens: { line: "//" }
  }
});
