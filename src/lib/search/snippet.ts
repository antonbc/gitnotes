/**
 * FTS5 snippets arrive as plain text with `<mark>`/`</mark>` wrapping each
 * matched term (see commands/search.rs). Split them into segments so the UI
 * can render highlights without injecting raw HTML from note content.
 */
export interface SnippetSegment {
  text: string;
  mark: boolean;
}

export function parseSnippet(snippet: string): SnippetSegment[] {
  const segments: SnippetSegment[] = [];
  const pattern = /<mark>(.*?)<\/mark>/gs;
  let cursor = 0;

  for (const match of snippet.matchAll(pattern)) {
    if (match.index > cursor) {
      segments.push({ text: snippet.slice(cursor, match.index), mark: false });
    }
    if (match[1]) {
      segments.push({ text: match[1], mark: true });
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < snippet.length) {
    segments.push({ text: snippet.slice(cursor), mark: false });
  }

  return segments;
}
