export function formatDate(iso, withSeconds = false) {
  if (!iso) return '未知';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '未知';
  const p = (n) => String(n).padStart(2, '0');
  const b = new Date(d.getTime() + 8 * 3600 * 1000);
  const base = `${b.getUTCFullYear()}-${p(b.getUTCMonth() + 1)}-${p(b.getUTCDate())} ${p(b.getUTCHours())}:${p(b.getUTCMinutes())}`;
  return withSeconds ? `${base}:${p(b.getUTCSeconds())}` : base;
}
