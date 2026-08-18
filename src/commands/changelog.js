import { getRelease, normalizeSource, normalizeChannel } from '../services/releases.js';
import { formatDate } from '../time.js';

const CHANNEL_LABEL = { release: '正式版', nightly: 'nightly', commit: 'commit' };
const SOURCE_LABEL = { cnb: 'cnb', gh: 'github' };

export const changelog = {
  names: ["log", "更新日志"],
  description: "获取更新日志",
  async execute({ reply, replyMarkdown, args }) {
    try {
      const opts = parseArgs(args || []);
      const release = await getRelease(opts.source, opts.channel);
      await replyMarkdown(buildSingle(release, opts.limit));
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

function buildSingle(release, limit) {
  const lines = [
    `# [${release.title}](${release.url.replace("https://cnb.cool/tiouo/portal/-/tags/", "https://cnb.cool/tiouo/portal/-/tag/")})`,
    "",
    `**通道**：${SOURCE_LABEL[release.source]} ${CHANNEL_LABEL[release.channel]}`,
    `**时间**：${formatDate(release.publishedAt, true)}`,
    "",
  ];
  const bodyLines = cleanBody(release.body).split('\n').map((s) => s.trim()).filter(Boolean);
  // 去掉与标题重复的首行
  if (bodyLines.length && bodyLines[0] === (release.title || '').trim()) bodyLines.shift();
  const itemIdx = bodyLines.findIndex((l) => /^[-*+]\s/.test(l));

  // 无变更条目：limit 按行数计
  if (itemIdx < 0) {
    const shown = limit ? bodyLines.slice(0, limit) : bodyLines.slice(0, 60);
    lines.push(...shown);
    if (bodyLines.length > shown.length) lines.push(`… 还有 ${bodyLines.length - shown.length} 行未显示`);
    return lines.join('\n');
  }

  // 有变更条目：limit 只按条目数计，说明行始终完整展示
  const prefix = bodyLines.slice(0, itemIdx);
  const items = bodyLines.slice(itemIdx);
  const shown = items.slice(0, limit || 60);
  lines.push(...prefix, ...shown);
  if (items.length > shown.length) lines.push(`… 还有 ${items.length - shown.length} 条未显示`);
  return lines.join('\n');
}

function cleanBody(body) {
  return (body || '该版本暂无更新日志内容').replace('`', '').replace('`', '');
}
