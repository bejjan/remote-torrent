import { countryFlagEmoji, isoCountryCode, isUnknownCountry } from "@/lib/deluge/country-flag";

export function PeerCountry({ country }: { country: string }) {
  const code = isoCountryCode(country);
  const flag = code ? countryFlagEmoji(code) : null;

  if (!code || !flag) {
    if (isUnknownCountry(country) || !country.trim()) {
      return <span className="text-muted-foreground">—</span>;
    }
    return <span>{country.trim()}</span>;
  }

  return (
    <span className="inline-flex min-w-0 shrink-0 items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden
        className="inline-flex h-4 max-h-4 shrink-0 items-center justify-center overflow-hidden text-[16px] leading-none"
      >
        {flag}
      </span>
      <span>{code}</span>
    </span>
  );
}
