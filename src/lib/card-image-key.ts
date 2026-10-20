// Primer pads collector numbers to three characters. Keep suffixes and variant
// markers intact: they identify distinct printings, not an implicit back face.
export function normalizeCollectorNumber(number: string): string {
  return number.replace(/^0+(?=\d)/, "");
}

export function cardImageKey(code: string, number: string): string {
  return `${code.toLowerCase()}/${normalizeCollectorNumber(number)}`;
}
