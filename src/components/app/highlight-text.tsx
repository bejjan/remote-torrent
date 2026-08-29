import { splitHighlightParts } from "@/lib/highlight-text";

/**
 * Renders `text` with case-insensitive substring matches wrapped in
 * `<mark class="search-hit">`. Dots and spaces in the query are interchangeable.
 * Empty queries render the original string.
 *
 * `text` must already be decoded (see `normalizeTorrentName`). Matches are
 * React text nodes so `&` is escaped by React, not injected as HTML.
 */
export function HighlightText({ text, query }: { text: string; query: string }) {
  const parts = splitHighlightParts(text, query);
  if (parts.length === 1 && !parts[0]?.match) {
    return text;
  }
  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <mark key={index} className="search-hit">
            {part.text}
          </mark>
        ) : (
          part.text
        )
      )}
    </>
  );
}
