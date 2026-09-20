export function roomCodeFromClipboard(text: string): string | null {
  const value = text.trim().toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(value)) return value;
  return value.match(/\b(?:ODA\s+KODU|KOD)\s*[:=\-]?\s*([A-Z0-9]{6})\b/)?.[1] ?? null;
}
