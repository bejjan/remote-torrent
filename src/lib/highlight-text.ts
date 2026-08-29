/** Escape a string so it can be used as a literal pattern in `RegExp`. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Fresh regex: shared `/g` objects keep `lastIndex` across calls. */
function separatorRuns(): RegExp {
  return /[.\s]+/g;
}

/**
 * Collapse dots and whitespace to a single space and lowercase.
 * Used so `game of thrones` and `game.of.thrones` compare equal.
 */
export function normalizeSearchText(value: string): string {
  return value.replace(separatorRuns(), " ").trim().toLowerCase();
}

/** True when `haystack` contains `query`, treating `.` and spaces as the same separator. */
export function matchesSearchQuery(haystack: string, query: string): boolean {
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  return normalizeSearchText(haystack).includes(needle);
}

/**
 * Case-insensitive regex that finds the query in a display string.
 * Each run of spaces/dots in the query becomes `[.\\s]+` so a spaced query
 * highlights the corresponding dotted characters (not a fake spaced string).
 */
export function searchHighlightRegExp(query: string): RegExp | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const tokens = trimmed.split(separatorRuns()).filter((token) => token.length > 0);
  if (tokens.length === 0) return null;
  return new RegExp(tokens.map(escapeRegExp).join("[.\\s]+"), "gi");
}

export type HighlightPart = {
  text: string;
  match: boolean;
};

/**
 * Split `text` into unmatched/matched segments for find-in-page highlighting.
 * Matching is case-insensitive. Dots and whitespace in the query are interchangeable
 * separators; other characters are literal. Empty/whitespace/separator-only queries
 * produce a single unmatched part (no highlights).
 */
export function splitHighlightParts(text: string, query: string): HighlightPart[] {
  if (!text) return [];
  const re = searchHighlightRegExp(query);
  if (!re) {
    return [{ text, match: false }];
  }

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
