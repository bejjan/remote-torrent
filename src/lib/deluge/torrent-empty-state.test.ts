import assert from "node:assert/strict";
import {
  SEARCH_EMPTY_QUERY_MAX,
  TORRENT_FILTER_EMPTY_HINT,
  TORRENT_FILTER_EMPTY_TITLE,
  TORRENT_SEARCH_EMPTY_HINT,
  displaySearchEmptyQuery,
  torrentSearchEmptyTitle,
} from "./torrent-empty-state";

assert.equal(displaySearchEmptyQuery("ubuntu"), "ubuntu");
assert.equal(displaySearchEmptyQuery("  mint  "), "mint");
assert.equal(displaySearchEmptyQuery("a".repeat(SEARCH_EMPTY_QUERY_MAX)), "a".repeat(SEARCH_EMPTY_QUERY_MAX));
assert.equal(
  displaySearchEmptyQuery("a".repeat(SEARCH_EMPTY_QUERY_MAX + 1)),
  `${"a".repeat(SEARCH_EMPTY_QUERY_MAX - 1)}…`
);

assert.equal(torrentSearchEmptyTitle("ubuntu.iso"), 'No torrents match "ubuntu.iso"');
assert.equal(torrentSearchEmptyTitle("  debian  "), 'No torrents match "debian"');
assert.equal(
  torrentSearchEmptyTitle("x".repeat(SEARCH_EMPTY_QUERY_MAX + 5)),
  `No torrents match "${"x".repeat(SEARCH_EMPTY_QUERY_MAX - 1)}…"`
);
assert.equal(
  torrentSearchEmptyTitle("x".repeat(SEARCH_EMPTY_QUERY_MAX + 5), false),
  `No torrents match "${"x".repeat(SEARCH_EMPTY_QUERY_MAX + 5)}"`
);

assert.equal(TORRENT_FILTER_EMPTY_TITLE, "No torrents match this view");
assert.match(TORRENT_FILTER_EMPTY_HINT, /clear filters/);
assert.match(TORRENT_SEARCH_EMPTY_HINT, /another name/);
assert.match(TORRENT_SEARCH_EMPTY_HINT, /spaces are treated the same/);
assert.doesNotMatch(TORRENT_SEARCH_EMPTY_HINT, /this view/);

console.log("torrent-empty-state tests passed");
