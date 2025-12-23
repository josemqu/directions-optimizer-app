export function formatAddressShort(label: string) {
  const raw = label.trim();
  if (!raw) return raw;

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (!parts.length) return raw;

  const streetAndNumber = parts[0];
  const city = parts.length >= 2 ? parts[1] : "";

  return city ? `${streetAndNumber}, ${city}` : streetAndNumber;
}
