const COUNTRY_TO_ISO: Record<string, string> = {
  Uruguay: "uy",
  Argentina: "ar",
  "Costa Rica": "cr",
  Panamá: "pa",
};

export function countryFlagClass(nacionalidad: string | null): string | null {
  if (!nacionalidad) return null;
  const iso = COUNTRY_TO_ISO[nacionalidad];
  return iso ? `fi fi-${iso}` : null;
}
