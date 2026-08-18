import { config } from '../config.js';
import { formatDate } from '../time.js';
import { getRelease, normalizeSource, normalizeChannel } from '../services/releases.js';

const CHANNEL_LABEL = { release: '正式版', nightly: 'nightly', commit: 'commit' };
const SOURCE_LABEL = { cnb: 'cnb', gh: 'github' };

const ASSET_ORDER = [
  'Portal.win.x64.installer.zip',
  'Portal.win.x64.portable.zip',
  'Portal.linux.x64.AppImage',
  'Portal.linux.x64.deb',
  'Portal.linux.x64.rpm',
  'Portal.osx.mac.x64.dmg',
  'Portal.osx.mac.x64.app.zip',
  'Portal.osx.mac.arm64.dmg',
  'Portal.osx.mac.arm64.app.zip',
];

function platformRank(name) {
  if (name.includes('.linux.')) return 1;
  if (name.includes('.osx.mac.')) return 2;
  return 0;
}

function sortAssets(assets) {
  const idx = new Map(ASSET_ORDER.map((n, i) => [n, i]));
  return [...assets].sort((a, b) => {
    const ra = idx.get(a.name);
    const rb = idx.get(b.name);
    const pa = platformRank(a.name);
    const pb = platformRank(b.name);
    if (pa !== pb) return pa - pb;
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });
}

export const download = {
  names: ['get', '下载'],
  description: '获取下载链接',
  async execute({ reply, replyMarkdown, args }) {
    try {
      const { source, channel } = parseArgs(args || []);
      const markdown = await buildDownloadMarkdown(source, channel);
      await replyMarkdown(markdown);
    } catch (err) {
      await reply(`下载信息获取失败：${err.message || err}`);
    }
  },
};

export async function buildDownloadMarkdown(source, channel) {
  const { release, assets } = await buildDownloadCard(source, channel);
  return formatCard({ release, assets });
}

async function buildDownloadCard(source, channel) {
  const release = await getRelease(source, channel);
  return { release, assets: sortAssets(filterAssets(release.assets)) };
}

function filterAssets(assets) {
  const hidden = config.hideAssets;
  if (!hidden.length) return assets;
  return assets.filter((a) => !hidden.some((h) => a.name.toLowerCase().includes(h.toLowerCase())));
}

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

function formatCard({ release, assets }) {
  const lines = [
    `# [${release.title}](${release.url}) `,
    ' ',
    `下载通道：${SOURCE_LABEL[release.source]} ${CHANNEL_LABEL[release.channel]}`,
    `发布时间：${formatDate(release.publishedAt)}     \n`,
    '---',
  ];
  if (!assets.length) {
    lines.push('该通道暂无可用下载资源');
  } else {
    lines.push('## Windows');
    lines.push(formatWindows(assets));
    lines.push('## Linux');
    lines.push(formatLinux(assets));
    lines.push('## MacOS');
    lines.push(formatMacOS(assets));
  }
  return lines.join('\n');
}

function findAsset(assets, pattern) {
  return assets.find((a) => pattern.test(a.name));
}

function assetLink(asset, label) {
  return `[${label}](${asset.url}) (${formatSize(asset.size)})`;
}

function formatWindows(assets) {
  const installer = findAsset(assets, /\.installer\./i);
  const portable = findAsset(assets, /\.portable\./i);
  const parts = [];
  if (installer) parts.push(assetLink(installer, '安装包'));
  if (portable) parts.push(assetLink(portable, '便携版'));
  return parts.length ? parts.join('\n') : '暂无可用资源';
}

function formatLinux(assets) {
  const appimage = findAsset(assets, /\.appimage$/i);
  const deb = findAsset(assets, /\.deb$/i);
  const rpm = findAsset(assets, /\.rpm$/i);
  const parts = [];
  if (appimage) parts.push(assetLink(appimage, 'appimage'));
  if (deb) parts.push(assetLink(deb, 'deb'));
  if (rpm) parts.push(assetLink(rpm, 'rpm') + '     ');
  return parts.length ? parts.join('\n') : '暂无可用资源';
}

function formatMacOS(assets) {
  const pick = (archPattern, typePattern, label) => {
    const a = assets.find((x) => archPattern.test(x.name) && typePattern.test(x.name));
    return a ? assetLink(a, label) : null;
  };
  const parts = [
    pick(/\.x64\./i, /\.dmg$/i, 'Intel'),
    pick(/\.x64\./i, /\.app\.zip$/i, 'Intel APP'),
    pick(/\.arm64\./i, /\.dmg$/i, 'Apple'),
    pick(/\.arm64\./i, /\.app\.zip$/i, 'Apple APP'),
  ].filter(Boolean);
  return parts.length ? parts.join(' \n ') : '暂无可用资源';
}

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return '未知';
  return `${(bytes / 1048576).toFixed(1)} MiB`;
}
