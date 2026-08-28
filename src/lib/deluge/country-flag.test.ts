import assert from "node:assert/strict";
import { countryFlagEmoji, isoCountryCode, isUnknownCountry } from "./country-flag";

assert.equal(isoCountryCode("US"), "US");
assert.equal(isoCountryCode("se"), "SE");
assert.equal(isoCountryCode("  nl "), "NL");
assert.equal(isoCountryCode(""), null);
assert.equal(isoCountryCode("   "), null);
assert.equal(isoCountryCode(null), null);
assert.equal(isoCountryCode(undefined), null);
assert.equal(isoCountryCode("??"), null);
assert.equal(isoCountryCode("?"), null);
assert.equal(isoCountryCode("U"), null);
assert.equal(isoCountryCode("USA"), null);
assert.equal(isoCountryCode("U1"), null);
assert.equal(isoCountryCode("12"), null);

assert.equal(isUnknownCountry(""), true);
assert.equal(isUnknownCountry("  "), true);
assert.equal(isUnknownCountry("??"), true);
assert.equal(isUnknownCountry("?"), true);
assert.equal(isUnknownCountry("unknown"), true);
assert.equal(isUnknownCountry("Unknown"), true);
assert.equal(isUnknownCountry("US"), false);
assert.equal(isUnknownCountry("Germany"), false);

assert.equal(countryFlagEmoji("US"), "🇺🇸");
assert.equal(countryFlagEmoji("se"), "🇸🇪");
assert.equal(countryFlagEmoji("DE"), "🇩🇪");
assert.equal(countryFlagEmoji("NL"), "🇳🇱");
assert.equal(countryFlagEmoji(""), null);
assert.equal(countryFlagEmoji("??"), null);
assert.equal(countryFlagEmoji("unknown"), null);

const us = countryFlagEmoji("US");
assert.ok(us);
const usPoints = [...us].map((ch) => ch.codePointAt(0));
assert.deepEqual(usPoints, [0x1f1fa, 0x1f1f8]);

console.log("country-flag tests passed");
