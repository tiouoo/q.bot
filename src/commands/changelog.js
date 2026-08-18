import { getRelease, listReleases, normalizeSource, normalizeChannel } from '../services/releases.js';

const CHANNEL_LABEL = { release: '正式版', nightly: 'nightly', commit: 'commit' };
const SOURCE_LABEL = { cnb: 'cnb', gh: 'github' };
const STABLE_TAG = /^v?\d+\.\d+\.\d+$/;

export const changelog = {
  names: ["log", "更新日志"],
  description: "获取更新日志",
  async execute({ reply, replyMarkdown, args }) {
    try {
      const opts = parseArgs(args || []);
      const markdown = await buildMarkdown(opts);
      await replyMarkdown(markdown);
    } catch (err) {
      await reply(`更新日志获取失败：${err.message || err}`);
    }
  },
};

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
  // commit / nightly：单个发布，limit 截断正文行数
  if (opts.channel !== 'release') {
    const release = await getRelease(opts.source, opts.channel);
    return buildSingle(release, opts.limit);
  }

  // 正式版：limit N 显示最近 N 个稳定版本，否则显示最新
  const releases = (await listReleases(opts.source)).filter((r) => STABLE_TAG.test(r.tagName));
  const n = opts.limit || 1;
  const recent = releases.slice(0, n);
  if (!recent.length) throw new Error('暂无发布记录');
  if (recent.length === 1) return buildSingle(recent[0], null);

  const lines = [`# 最近 ${recent.length} 个版本`, ''];
  for (const r of recent) {
    lines.push(`## ${r.title || r.tagName}`, '');
    const bodyLines = cleanBody(r.body).split('\n').filter(Boolean);
    lines.push(...bodyLines.slice(0, 12));
    if (bodyLines.length > 12) lines.push('…');
    lines.push('');
  }
  return truncate(lines.join('\n'), 3500);
}

function buildSingle(release, limit) {
  const lines = [
    `# [${release.title}](${release.url})`,
    '',
    `**通道**：${SOURCE_LABEL[release.source]} ${CHANNEL_LABEL[release.channel]}`,
    '',
  ];
  const bodyLines = cleanBody(release.body).split('\n').filter(Boolean);
  const max = limit || 60;
  lines.push(...bodyLines.slice(0, max));
  if (bodyLines.length > max) lines.push(`… 还有 ${bodyLines.length - max} 行未显示`);
  return lines.join('\n');
}

function cleanBody(body) {
  return (body || '该版本暂无更新日志内容').replace('`', '').replace('`', '');
}

function truncate(s, max) {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n…（内容过长已截断）`;
}
