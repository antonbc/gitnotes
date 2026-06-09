// Ported from the prototype's highlight.jsx:
//   highlightSource(src, ext) -> string[] (one HTML line each)
//   renderMarkdown(src) -> html string
//   renderTypst(src) -> { html, diagnostics }

const NUL = String.fromCharCode(0);
const SENT = new RegExp(NUL + "(\\d+)" + NUL, "g");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function stasher() {
  const store = [];
  return {
    stash: (html) => {
      store.push(html);
      return NUL + (store.length - 1) + NUL;
    },
    restore: (text) => text.replace(SENT, (m, i) => store[+i]),
  };
}

/* ---------- inline highlighting for the raw EDITOR (markdown) ---------- */
function inlineMd(text) {
  const { stash, restore } = stasher();
  text = text.replace(/`([^`]+)`/g, (m, a) => stash('<span class="s-code">`' + esc(a) + '`</span>'));
  text = text.replace(/(!?)\[([^\]]*)\]\(([^)]+)\)/g, (m, bang, t, u) =>
    stash('<span class="s-punct">' + bang + '[</span><span class="s-link">' + esc(t) +
      '</span><span class="s-punct">](</span><span class="s-link">' + esc(u) + '</span><span class="s-punct">)</span>'));
  text = text.replace(/\*\*([^*]+)\*\*/g, (m, a) =>
    stash('<span class="s-punct">**</span><span class="s-strong">' + esc(a) + '</span><span class="s-punct">**</span>'));
  text = text.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, (m, pre, a) =>
    pre + stash('<span class="s-punct">*</span><span class="s-em">' + esc(a) + '</span><span class="s-punct">*</span>'));
  text = text.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, (m, pre, a) =>
    pre + stash('<span class="s-punct">_</span><span class="s-em">' + esc(a) + '</span><span class="s-punct">_</span>'));
  text = text.replace(/(\$[^$\n]+\$)/g, (m, a) => stash('<span class="s-string">' + esc(a) + '</span>'));
  text = esc(text);
  return restore(text);
}

function hlMarkdownLine(line, st) {
  const fence = line.match(/^(\s*)(```+|~~~+)(.*)$/);
  if (fence) {
    st.code = !st.code;
    return '<span class="s-punct">' + esc(fence[1] + fence[2]) + '</span><span class="s-func">' + esc(fence[3]) + "</span>";
  }
  if (st.code) return '<span class="s-codeblock">' + (esc(line) || "&nbsp;") + "</span>";
  if (line.trim() === "") return "&nbsp;";
  if (/^(\s*)(---|\*\*\*|___)\s*$/.test(line)) return '<span class="s-hr">' + esc(line) + "</span>";
  let m;
  if ((m = line.match(/^(\s*)(#{1,6})(\s+)(.*)$/)))
    return esc(m[1]) + '<span class="s-punct">' + m[2] + "</span>" + esc(m[3]) +
      '<span class="s-head">' + inlineMd(m[4]) + "</span>";
  if ((m = line.match(/^(\s*)(>+)(\s?)(.*)$/)))
    return esc(m[1]) + '<span class="s-quote">' + esc(m[2]) + "</span>" + esc(m[3]) +
      '<span class="s-quote">' + inlineMd(m[4]) + "</span>";
  if ((m = line.match(/^(\s*)([-*+]|\d+\.)(\s+)(\[[ xX]\]\s+)?(.*)$/))) {
    let task = "";
    if (m[4]) {
      const done = /[xX]/.test(m[4]);
      task = '<span class="' + (done ? "s-task-done" : "s-punct") + '">' + esc(m[4].trimEnd()) + "</span> ";
    }
    return esc(m[1]) + '<span class="s-list">' + esc(m[2]) + "</span>" + esc(m[3]) + task + inlineMd(m[5]);
  }
  if (/^\s*\|.*\|\s*$/.test(line)) return '<span class="s-punct">' + esc(line) + "</span>";
  return inlineMd(line);
}

/* ---------- inline highlighting for typst ---------- */
function inlineTyp(text) {
  const { stash, restore } = stasher();
  text = text.replace(/`([^`]+)`/g, (m, a) => stash('<span class="s-code">`' + esc(a) + '`</span>'));
  text = text.replace(/#([a-zA-Z][\w.]*)/g, (m, a) => stash('<span class="s-func">#' + esc(a) + "</span>"));
  text = text.replace(/"([^"]*)"/g, (m, a) => stash('<span class="s-string">"' + esc(a) + '"</span>'));
  text = text.replace(/\*([^*\n]+)\*/g, (m, a) =>
    stash('<span class="s-punct">*</span><span class="s-strong">' + esc(a) + '</span><span class="s-punct">*</span>'));
  text = text.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, (m, pre, a) =>
    pre + stash('<span class="s-punct">_</span><span class="s-em">' + esc(a) + '</span><span class="s-punct">_</span>'));
  text = esc(text);
  return restore(text);
}

function hlTypstLine(line) {
  if (line.trim() === "") return "&nbsp;";
  if (/^\s*\/\//.test(line)) return '<span class="s-comment">' + esc(line) + "</span>";
  let m;
  if ((m = line.match(/^(\s*)(==?=?=?=?=?)(\s+)(.*)$/)))
    return esc(m[1]) + '<span class="s-head">' + esc(m[2]) + "</span>" + esc(m[3]) +
      '<span class="s-head">' + inlineTyp(m[4]) + "</span>";
  if ((m = line.match(/^(\s*)([-+])(\s+)(.*)$/)))
    return esc(m[1]) + '<span class="s-list">' + esc(m[2]) + "</span>" + esc(m[3]) + inlineTyp(m[4]);
  return inlineTyp(line);
}

export function highlightSource(src, ext) {
  const lines = src.split("\n");
  if (ext === "typ") return lines.map(hlTypstLine);
  const st = { code: false };
  return lines.map((l) => hlMarkdownLine(l, st));
}

/* ---------- tiny TeX-ish renderer for preview math ---------- */
function texToHtml(s) {
  s = s.replace(/\\,/g, " ").replace(/\\;/g, " ").replace(/\\!/g, "");
  const sym = {
    "\\int": "∫", "\\infty": "∞", "\\pi": "π", "\\cdot": "·", "\\times": "×",
    "\\le": "≤", "\\ge": "≥", "\\sum": "∑", "\\approx": "≈", "\\partial": "∂",
    "\\rightarrow": "→", "\\to": "→",
  };
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (m, a, b) =>
    '<span style="display:inline-flex;flex-direction:column;text-align:center;vertical-align:middle;font-size:.85em;margin:0 .15em">' +
    '<span style="border-bottom:1px solid currentColor;padding:0 .25em">' + texToHtml(a) + "</span>" +
    '<span style="padding:0 .25em">' + texToHtml(b) + "</span></span>");
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, (m, a) =>
    '√<span style="border-top:1px solid currentColor;padding:0 .15em">' + texToHtml(a) + "</span>");
  for (const k in sym) s = s.split(k).join(sym[k]);
  s = s.replace(/\^\{([^{}]+)\}/g, (m, a) => "<sup>" + texToHtml(a) + "</sup>");
  s = s.replace(/_\{([^{}]+)\}/g, (m, a) => "<sub>" + texToHtml(a) + "</sub>");
  s = s.replace(/\^(\w)/g, (m, a) => "<sup>" + a + "</sup>");
  s = s.replace(/_(\w)/g, (m, a) => "<sub>" + a + "</sub>");
  s = s.replace(/\\[a-zA-Z]+/g, (m) => m.slice(1));
  return s;
}

/* ---------- inline markdown -> preview html ---------- */
function inlineHtmlMd(text) {
  const { stash, restore } = stasher();
  text = text.replace(/`([^`]+)`/g, (m, a) => stash("<code>" + esc(a) + "</code>"));
  text = text.replace(/\$([^$\n]+)\$/g, (m, a) => stash('<span class="katex">' + texToHtml(esc(a)) + "</span>"));
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, u) =>
    stash('<span class="md-img" title="' + esc(u) + '">\u{1f5bc} ' + esc(alt || u) + "</span>"));
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t) =>
    stash('<a href="#" onclick="return false">' + esc(t) + "</a>"));
  text = text.replace(/\*\*([^*]+)\*\*/g, (m, a) => stash("<strong>" + esc(a) + "</strong>"));
  text = text.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, (m, pre, a) => pre + stash("<em>" + esc(a) + "</em>"));
  text = text.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, (m, pre, a) => pre + stash("<em>" + esc(a) + "</em>"));
  text = esc(text);
  return restore(text);
}

function hlCode(code, lang) {
  let h = esc(code);
  if (lang === "rust") {
    h = h.replace(/\b(fn|let|mut|return|use|struct|impl|pub|match|if|else|for|in|Result|Ok|Err|Self)\b/g, '<span class="hl-kw">$1</span>');
    h = h.replace(/([A-Za-z_]\w*)(\()/g, '<span class="hl-fn">$1</span>$2');
    h = h.replace(/(&quot;[^&]*?&quot;)/g, '<span class="hl-str">$1</span>');
    h = h.replace(/\/\/[^\n]*/g, (m) => '<span class="hl-com">' + m + "</span>");
  }
  return h;
}

export function renderMarkdown(src) {
  const lines = src.split("\n");
  let out = "", i = 0;
  while (i < lines.length) {
    let line = lines[i];
    let fm = line.match(/^```+\s*([\w-]*)\s*$/);
    if (fm) {
      const lang = fm[1]; const buf = []; i++;
      while (i < lines.length && !/^```+\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out += "<pre><code>" + hlCode(buf.join("\n"), lang) + "</code></pre>";
      continue;
    }
    if (/^\$\$\s*$/.test(line)) {
      const buf = []; i++;
      while (i < lines.length && !/^\$\$\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out += '<div class="mathblock"><span class="katex">' + texToHtml(esc(buf.join(" "))) + "</span></div>";
      continue;
    }
    let hm = line.match(/^(#{1,6})\s+(.*)$/);
    if (hm) { const lv = hm[1].length; out += "<h" + lv + ">" + inlineHtmlMd(hm[2]) + "</h" + lv + ">"; i++; continue; }
    if (/^(---|\*\*\*|___)\s*$/.test(line)) { out += "<hr/>"; i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      const head = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      i += 2; const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim())); i++;
      }
      out += "<table><thead><tr>" + head.map((c) => "<th>" + inlineHtmlMd(c) + "</th>").join("") + "</tr></thead><tbody>" +
        rows.map((r) => "<tr>" + r.map((c) => "<td>" + inlineHtmlMd(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
      continue;
    }
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      out += "<blockquote>" + renderMarkdown(buf.join("\n")) + "</blockquote>";
      continue;
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        const lm = lines[i].match(/^\s*([-*+]|\d+\.)\s+(.*)$/);
        let body = lm[2];
        const task = body.match(/^\[([ xX])\]\s+(.*)$/);
        if (task) {
          const done = /[xX]/.test(task[1]);
          items.push('<li class="task' + (done ? " done" : "") + '"><span class="box">' +
            (done ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="4 12 10 18 20 5"/></svg>' : "") +
            '</span><span class="txt">' + inlineHtmlMd(task[2]) + "</span></li>");
        } else {
          items.push("<li>" + inlineHtmlMd(body) + "</li>");
        }
        i++;
      }
      out += (ordered ? "<ol>" : "<ul>") + items.join("") + (ordered ? "</ol>" : "</ul>");
      continue;
    }
    if (line.trim() === "") { i++; continue; }
    const buf = [line]; i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,6}\s|>|\s*([-*+]|\d+\.)\s|```|\$\$|\|)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out += "<p>" + inlineHtmlMd(buf.join(" ")) + "</p>";
  }
  return out;
}

/* ---------- typst -> "compiled page" ---------- */
function inlineHtmlTyp(text) {
  const { stash, restore } = stasher();
  text = text.replace(/#text\(weight:\s*"bold"\)\[([^\]]*)\]/g, (m, a) => stash("<strong>" + esc(a) + "</strong>"));
  text = text.replace(/#link\("([^"]*)"\)\[([^\]]*)\]/g, (m, u, t) => stash('<a href="#" onclick="return false">' + esc(t) + "</a>"));
  text = text.replace(/`([^`]+)`/g, (m, a) => stash("<code>" + esc(a) + "</code>"));
  text = text.replace(/\*([^*\n]+)\*/g, (m, a) => stash("<strong>" + esc(a) + "</strong>"));
  text = text.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, (m, pre, a) => pre + stash("<em>" + esc(a) + "</em>"));
  text = esc(text);
  return restore(text);
}

export function renderTypst(src) {
  const lines = src.split("\n");
  const diagnostics = [];
  let body = "", i = 0;
  while (i < lines.length) {
    let line = lines[i];
    const t = line.trim();
    if (t === "" || /^#set\b/.test(t) || /^#show\b/.test(t) || /^#import\b/.test(t) || /^#let\b/.test(t)) { i++; continue; }
    let m;
    if ((m = t.match(/^(==?=?=?)\s+(.*)$/))) {
      const lv = Math.min(m[1].length, 2);
      body += "<h" + lv + ">" + inlineHtmlTyp(m[2]) + "</h" + lv + ">"; i++; continue;
    }
    if ((m = t.match(/^#image\("([^"]+)"/))) {
      body += '<div class="imgbox">' + esc(m[1]) + "</div>";
      diagnostics.push({ line: i + 1, col: 1, severity: "warning", message: 'image "' + m[1] + '" not found in vault — showing placeholder' });
      i++; continue;
    }
    if ((m = t.match(/^#quote\[([^\]]*)\]/))) { body += "<blockquote>" + inlineHtmlTyp(m[1]) + "</blockquote>"; i++; continue; }
    if ((m = t.match(/^#link\("([^"]*)"\)\[([^\]]*)\]/))) { body += "<p>" + inlineHtmlTyp(t) + "</p>"; i++; continue; }
    if (/^[-+]\s+/.test(t)) {
      const items = [];
      while (i < lines.length && /^\s*[-+]\s+/.test(lines[i])) {
        items.push("<li>" + inlineHtmlTyp(lines[i].replace(/^\s*[-+]\s+/, "")) + "</li>"); i++;
      }
      body += "<ul>" + items.join("") + "</ul>"; continue;
    }
    const buf = [line]; i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(==?=?|[-+]\s|#image|#quote)/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
    body += "<p>" + inlineHtmlTyp(buf.join(" ")) + "</p>";
  }
  const html = '<div class="typ-page"><div class="lead">field-notes / letter.typ — compiled</div>' + body + '<div class="pno">1</div></div>';
  return { html, diagnostics };
}
