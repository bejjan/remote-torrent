export type WebLanguage = { id: string; label: string };

/** Base UI Select cannot use `""` as a value; map daemon `language: ""` to this. */
export const SYSTEM_LANGUAGE_SELECT_VALUE = "system";

const SYSTEM_DEFAULT: WebLanguage = { id: SYSTEM_LANGUAGE_SELECT_VALUE, label: "System default" };

function rowFromUnknown(row: unknown): WebLanguage | null {
  if (Array.isArray(row) && row.length >= 2) {
    return { id: String(row[0] ?? ""), label: String(row[1] ?? row[0] ?? "") };
  }
  if (row && typeof row === "object") {
    const rec = row as Record<string, unknown>;
    const id = rec.id ?? rec.code ?? rec[0];
    const label = rec.label ?? rec.name ?? rec.text ?? rec[1] ?? id;
    if (id == null) return null;
    return { id: String(id), label: String(label ?? id) };
  }
  return null;
}

/** Official `web.get_languages` / `webutils.get_languages`: `[[id, name], ...]`. */
export function parseWebLanguages(raw: unknown): WebLanguage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: WebLanguage[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    const parsed = rowFromUnknown(row);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    out.push(parsed);
  }
  return out.length ? out : null;
}

export function webLanguageOptions(languages: WebLanguage[] | null | undefined): WebLanguage[] {
  const rest = (languages || []).filter(
    (lang) => lang.id !== "" && lang.id !== SYSTEM_LANGUAGE_SELECT_VALUE
  );
  return [SYSTEM_DEFAULT, ...rest];
}

export function selectValueForLanguage(language: string): string {
  return language ? language : SYSTEM_LANGUAGE_SELECT_VALUE;
}

export function languageFromSelectValue(value: string): string {
  return value === SYSTEM_LANGUAGE_SELECT_VALUE ? "" : value;
}

export function webLanguageSelectItems(languages: WebLanguage[] | null | undefined): Record<string, string> {
  return Object.fromEntries(webLanguageOptions(languages).map((lang) => [lang.id, lang.label]));
}

export const WEB_LANGUAGE_METHODS = ["web.get_languages", "webutils.get_languages"] as const;
