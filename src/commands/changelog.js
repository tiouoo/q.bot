import { getRelease, normalizeSource, normalizeChannel } from '../services/releases.js';

const CHANNEL_LABEL = { release: '正式版', nightly: 'nightly', commit: 'commit' };
const SOURCE_LABEL = { cnb: 'cnb', gh: 'github' };

export const changelog = {
  names: ['changelog', '更新日志'],
  description: '获取更新日志',
  async execute({ reply, replyMarkdown, args }) {
    try {
      const { source, channel } = parseArgs(args || []);
      const release = await getRelease(source, channel);
      await replyMarkdown(buildMarkdown(release));
    } catch (err) {
      await reply(`更新日志获取失败：${err.message || err}`);
    }
  },
};

function parseArgs(args) {
  let source = 'cnb';
  let channel = 'release';
  for (const raw of args) {
    if (normalizeSource(raw)) {
      source = normalizeSource(raw);
      continue;
    }
    if (normalizeChannel(raw)) channel = normalizeChannel(raw);
  }
  if (channel !== 'release') source = 'gh';
  return { source, channel };
}

function buildMarkdown(release) {
  const lines = [
    `# [${release.title}](${release.url})`,
    '',
    `**通道**：${SOURCE_LABEL[release.source]} ${CHANNEL_LABEL[release.channel]}`,
    '',
  ];
  if (release.body) {
    lines.push(release.body.replace('`', '').replace('`', ''));
  } else {
    lines.push('该版本暂无更新日志内容');
  }
  return lines.join('\n');
}
