/** Escape a string so it can be used as a literal pattern in `RegExp`. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type HighlightPart = {
  text: string;
  match: boolean;
};

/**
 * Split `text` into unmatched/matched segments for find-in-page highlighting.
 * Matching is case-insensitive; `query` is treated as literal text (not a regex).
 * Empty/whitespace queries produce a single unmatched part (no highlights).
 */
export function splitHighlightParts(text: string, query: string): HighlightPart[] {
  if (!text) return [];
  const needle = query.trim();
  if (!needle) {
    return [{ text, match: false }];
  }

  const re = new RegExp(escapeRegExp(needle), "gi");
  const parts: HighlightPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), match: false });
    }
    parts.push({ text: match[0], match: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), match: false });
  }

  return parts.length > 0 ? parts : [{ text, match: false }];
}
