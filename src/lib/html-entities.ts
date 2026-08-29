const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/**
 * Decode a single pass of HTML entities commonly seen in torrent names.
 * Named: `&amp;` `&lt;` `&gt;` `&quot;` `&apos;` / `&#39;`.
 * Numeric: `&#38;` and `&#x26;`.
 *
 * Already-decoded text is unchanged. Does not loop, so `&amp;amp;` becomes
 * `&amp;` rather than `&`.
 */
export function decodeHtmlEntities(value: string): string {
  if (!value.includes("&")) return value;
  return value.replace(/&(#\d+|#x[\da-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body.charAt(0) === "#") {
      const hex = body.charAt(1) === "x" || body.charAt(1) === "X";
      const code = hex ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}
