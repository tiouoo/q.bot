import { listReleases, compareTags, normalizeSource, normalizeChannel } from '../services/releases.js';

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
  const opts = { source: 'cnb', channel: 'release', limit: null, tag: null };
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
    if (low === 'tag') {
      const v = args[i + 1];
      if (!v) throw new Error('tag 缺少参数，如：log tag v1.0.3');
      opts.tag = v;
      i++;
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
  if (opts.tag) return buildTagMarkdown(opts);
  return buildListMarkdown(opts);
}

async function buildTagMarkdown({ source, tag, limit }) {
  const releases = await listReleases(source);
  const sorted = [...releases].sort((a, b) =>
    String(a.publishedAt || '').localeCompare(String(b.publishedAt || ''))
  );
  const idx = sorted.findIndex((r) => r.tagName === tag);
  if (idx < 0) throw new Error(`未找到 tag：${tag}`);
  const target = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const range = prev ? `${prev.tagName} → ${target.tagName}` : target.tagName;

  // GitHub 源：拉取两个 tag 之间的提交
  const cmp = prev && source === 'gh' ? await compareTags(prev.tagName, target.tagName) : null;
  if (cmp && cmp.commits.length) {
    const max = limit || 30;
    const shown = cmp.commits.slice(0, max);
    const lines = [`# ${range} · ${cmp.total} 个提交`, ''];
    for (const c of shown) lines.push(`- \`${c.sha}\` ${c.message}`);
    if (shown.length < cmp.commits.length) lines.push(`… 还有 ${cmp.commits.length - shown.length} 条未显示`);
    if (cmp.url) lines.push('', `[查看完整对比](${cmp.url})`);
    return lines.join('\n');
  }

  // CNB 或无上一个 tag：展示目标版本正文（正文含相对上个 tag 的更改）
  const bodyLines = (target.body || '该版本暂无更新日志内容').split('\n').filter(Boolean);
  const max = limit || 60;
  const shown = bodyLines.slice(0, max);
  const lines = [`# ${range}`, ''];
  lines.push(...shown);
  if (bodyLines.length > shown.length) lines.push(`… 还有 ${bodyLines.length - shown.length} 行未显示`);
  return lines.join('\n');
}

async function buildListMarkdown({ source, limit }) {
  const releases = (await listReleases(source)).filter((r) => STABLE_TAG.test(r.tagName));
  const n = limit || 1;
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
