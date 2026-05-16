// Compliance helpers. Most heavy lifting happens in DB triggers
// (see 0009_finance_compliance_audit.sql); this file holds the lists
// and helpers consumed by the API layer.

export const GAFI_GREY_LIST: readonly string[] = [
  "AL", // Albania
  "BB", // Barbados
  "BF", // Burkina Faso
  "KH", // Cambodia
  "KY", // Cayman Islands
  "HT", // Haiti
  "JM", // Jamaica
  "JO", // Jordan
  "ML", // Mali
  "MA", // Morocco
  "MZ", // Mozambique
  "MM", // Myanmar
  "NI", // Nicaragua
  "PK", // Pakistan
  "PA", // Panama
  "PH", // Philippines
  "SN", // Senegal
  "SS", // South Sudan
  "SY", // Syria
  "TR", // Turkey
  "UG", // Uganda
  "YE", // Yemen
];

export const GAFI_BLACK_LIST: readonly string[] = [
  "IR", // Iran
  "KP", // North Korea
];

export function gafiRisk(countryCode: string): "black" | "grey" | "ok" {
  const cc = countryCode?.toUpperCase?.() ?? "";
  if (GAFI_BLACK_LIST.includes(cc)) return "black";
  if (GAFI_GREY_LIST.includes(cc)) return "grey";
  return "ok";
}
