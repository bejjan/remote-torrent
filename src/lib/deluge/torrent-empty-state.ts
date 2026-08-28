/** Max characters of the search query shown in the empty-table title. */
export const SEARCH_EMPTY_QUERY_MAX = 40;

export const TORRENT_FILTER_EMPTY_TITLE = "No torrents match this view";
export const TORRENT_FILTER_EMPTY_HINT =
  "Add a torrent or clear filters to see the session.";

export const TORRENT_SEARCH_EMPTY_HINT =
  "Try another name. Periods (.) and spaces are treated the same.";

export function displaySearchEmptyQuery(
  search: string,
  max = SEARCH_EMPTY_QUERY_MAX
): string {
  const query = search.trim();
  if (query.length <= max) return query;
  return `${query.slice(0, Math.max(1, max - 1))}…`;
}

export function torrentSearchEmptyTitle(search: string, truncate = true): string {
  const query = truncate ? displaySearchEmptyQuery(search) : search.trim();
  return `No torrents match "${query}"`;
}
