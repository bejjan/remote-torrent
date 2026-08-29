import assert from "node:assert/strict";
import {
  parseWebLanguages,
  SYSTEM_LANGUAGE_SELECT_VALUE,
  WEB_LANGUAGE_METHODS,
  languageFromSelectValue,
  selectValueForLanguage,
  webLanguageOptions,
  webLanguageSelectItems,
} from "./web-languages";

assert.deepEqual(WEB_LANGUAGE_METHODS, ["web.get_languages", "webutils.get_languages"]);

const parsed = parseWebLanguages([
  ["en", "English"],
  ["de", "German"],
  ["en", "English duplicate"],
]);
assert.deepEqual(parsed, [
  { id: "en", label: "English" },
  { id: "de", label: "German" },
]);

assert.equal(parseWebLanguages([]), null);
assert.equal(parseWebLanguages(null), null);
assert.deepEqual(parseWebLanguages([{ id: "fr", name: "French" }]), [{ id: "fr", label: "French" }]);

const options = webLanguageOptions(parsed);
assert.equal(options[0]?.id, SYSTEM_LANGUAGE_SELECT_VALUE);
assert.equal(options[0]?.label, "System default");
assert.equal(options.length, 3);

const items = webLanguageSelectItems(parsed);
assert.equal(items[SYSTEM_LANGUAGE_SELECT_VALUE], "System default");
assert.equal(items.en, "English");
assert.notEqual(items.en, "en");

assert.equal(selectValueForLanguage(""), SYSTEM_LANGUAGE_SELECT_VALUE);
assert.equal(selectValueForLanguage("de"), "de");
assert.equal(languageFromSelectValue(SYSTEM_LANGUAGE_SELECT_VALUE), "");
assert.equal(languageFromSelectValue("fr"), "fr");

console.log("web-languages tests passed");
