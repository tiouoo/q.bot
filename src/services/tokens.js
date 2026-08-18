const PROFILE_URL = 'https://tokens.ci/u/tiouoo';

function parseEscapedString(s) {
  return JSON.parse(`"${s}"`);
}

function findInitialData(node) {
  if (!node || typeof node !== 'object') return null;
  if (node.initialData) return node.initialData;
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = findInitialData(item);
      if (r) return r;
    }
    return null;
  }
  for (const key of Object.keys(node)) {
    const r = findInitialData(node[key]);
    if (r) return r;
  }
  return null;
}

function extractInitialData(html) {
  const re = /self\.__next_f\.push\(\[1,"((?:\\.|[^"])*)"\]\)/g;
  let m;
  while ((m = re.exec(html))) {
    const s = m[1];
    if (s.indexOf('initialData') === -1) continue;
    try {
      const flight = parseEscapedString(s);
      const start = flight.indexOf('[');
      if (start < 0) continue;
      const arr = JSON.parse(flight.slice(start).trim());
      const data = findInitialData(arr);
      if (data) return data;
    } catch {
      // try next chunk
    }
  }
  return null;
}

export async function getTokenProfile() {
  const res = await fetch(PROFILE_URL, {
    headers: { 'User-Agent': 'q.bot' },
  });
  if (!res.ok) throw new Error(`tokens.ci 请求失败 (HTTP ${res.status})`);
  const html = await res.text();
  const data = extractInitialData(html);
  if (!data) throw new Error('tokens.ci 页面解析失败');
  return data;
}

export function todayInShanghai() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

export function findContribution(contributions, date) {
  if (!Array.isArray(contributions)) return null;
  return contributions.find((c) => c && c.date === date) || null;
}

export function formatTokens(n) {
  if (!n || n <= 0) return '0';
  const units = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [base, suffix] of units) {
    if (n >= base) return `${(n / base).toFixed(1)}${suffix}`;
  }
  return String(Math.round(n));
}

export function formatCost(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export function formatDateCN(iso) {
  if (!iso) return '未知';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '未知';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}
