import { listReleases, normalizeSource, normalizeChannel } from '../services/releases.js';

export const changelog = {
  names: ['log', '更新日志'],
  description: '获取更新日志',
  async execute({ reply, replyMarkdown, args }) {
    try {
      const markdown = await buildMarkdown(parseArgs(args || []));
      await replyMarkdown(markdown);
    } catch (err) {
      await reply(`更新日志获取失败：${err.message || err}`);
    }
  },
};

const STABLE_TAG = /^v?\d+\.\d+\.\d+$/;

function parseArgs(args) {
  const opts = { source: 'cnb', channel: 'release', limit: null };
  for (let i = 0; i < args.length; i++) {
    const raw = args[i];
    const low = String(raw).toLowerCase();
    if (low === 'limit') {
      const n = Number.parseInt(args[i + 1], 10);
      if (!Number.isNaN(n) && n > 0) {
        opts.limit = n;
        i++;
      }
      continue;
    }
    const src = normalizeSource(raw);
    if (src) {
      opts.source = src;
      continue;
    }
    const ch = normalizeChannel(raw);
    if (ch) opts.channel = ch;
  }
  if (opts.channel !== 'release') opts.source = 'gh';
  return opts;
}

async function buildMarkdown(opts) {
  const releases = (await listReleases(opts.source)).filter((r) => STABLE_TAG.test(r.tagName));
  const n = opts.limit || 1;
  const recent = releases.slice(0, n);
  if (!recent.length) throw new Error('暂无发布记录');

  const lines = recent.length > 1 ? [`# 最近 ${recent.length} 个版本`, ''] : [];
  for (const r of recent) {
    lines.push(`## ${r.title || r.tagName}`, '');
    const bodyLines = (r.body || '该版本暂无更新日志内容').split('\n').filter(Boolean);
    const max = recent.length > 1 ? 12 : 60;
    lines.push(...bodyLines.slice(0, max));
    if (bodyLines.length > max) lines.push('…');
    lines.push('');
  }
  return truncate(lines.join('\n'), 3500);
}

function truncate(s, max) {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n…（内容过长已截断）`;
}
