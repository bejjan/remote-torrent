/** Regional Indicator Symbol Letter A (U+1F1E6). */
const REGIONAL_INDICATOR_A = 0x1f1e6;

/**
 * Deluge `peers[].country` is usually a 2-letter ISO 3166-1 alpha-2 code
 * (`US`, `SE`) or empty / `??` when GeoIP does not know.
 */
export function isoCountryCode(country: string | null | undefined): string | null {
  if (country == null) return null;
  const cc = country.trim().toUpperCase();
  if (cc.length !== 2) return null;
  const a = cc.charCodeAt(0);
  const b = cc.charCodeAt(1);
  if (a < 65 || a > 90 || b < 65 || b > 90) return null;
  return cc;
}

export function isUnknownCountry(country: string | null | undefined): boolean {
  if (country == null) return true;
  const raw = country.trim();
  if (!raw) return true;
  const upper = raw.toUpperCase();
  return raw === "?" || raw === "??" || upper === "UNKNOWN";
}

/** Flag emoji from regional indicator letters, or null when the code is unusable. */
export function countryFlagEmoji(country: string | null | undefined): string | null {
  const cc = isoCountryCode(country);
  if (!cc) return null;
  return String.fromCodePoint(
    REGIONAL_INDICATOR_A + (cc.charCodeAt(0) - 65),
    REGIONAL_INDICATOR_A + (cc.charCodeAt(1) - 65)
  );
}
