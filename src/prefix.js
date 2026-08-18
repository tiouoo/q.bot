export const PREFIXES = [".", "/", "\\", "。"];

export function stripPrefix(content) {
  const text = (content || "").trim();
  if (!text) return null;
  for (const p of PREFIXES) {
    if (text.startsWith(p)) return text.slice(p.length).trim();
  }
  return null;
}
