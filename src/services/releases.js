import { fetch as proxyFetch, ProxyAgent } from 'undici';
import { config } from '../config.js';

const GH_REPO = 'tiouoo/Portal';
const CNB_REPO = 'tiouo/portal';

const GH_LIST_URL = `https://api.github.com/repos/${GH_REPO}/releases?per_page=100`;
const CNB_LIST_URL = `https://api.cnb.cool/${CNB_REPO}/-/releases?page=1&page_size=100`;
const GH_TAG_URL = (tag) =>
  `https://api.github.com/repos/${GH_REPO}/releases/tags/${encodeURIComponent(tag)}`;
const CNB_TAG_URL = (tag) =>
  `https://api.cnb.cool/${CNB_REPO}/-/releases/tags/${encodeURIComponent(tag)}`;

const STABLE_TAG = /^v?(\d+)\.(\d+)\.(\d+)$/;

let proxyAgent = null;

function getProxyAgent() {
  if (!config.githubProxy) return null;
  if (!proxyAgent) proxyAgent = new ProxyAgent(config.githubProxy);
  return proxyAgent;
}

async function cnbGet(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.cnb.api+json',
      Authorization: `Bearer ${config.cnbToken}`,
    },
  });
  if (!res.ok) throw new Error(`CNB 请求失败 (HTTP ${res.status})`);
  return res.json();
}

async function ghGet(url) {
  const agent = getProxyAgent();
  const res = await proxyFetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'q.bot' },
    dispatcher: agent ?? undefined,
  });
  if (!res.ok) throw new Error(`GitHub 请求失败 (HTTP ${res.status})`);
  return res.json();
}

export function normalizeSource(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v || v === 'cnb') return 'cnb';
  if (v === 'gh' || v === 'github') return 'gh';
  return null;
}

export function normalizeChannel(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v || v === 'release' || v === 'stable' || v === '正式版') return 'release';
  if (v === 'commit') return 'commit';
  if (v === 'nightly') return 'nightly';
  return null;
}

export async function getRelease(source, channel) {
  const src = normalizeSource(source);
  const ch = normalizeChannel(channel);
  if (!src || !ch) throw new Error(`不支持的参数：${source || ''} ${channel || ''}`);

  if (src === 'cnb' && !config.cnbToken) throw new Error('未配置 CNB_TOKEN，无法从 CNB 获取更新信息');

  let rel;
  if (ch === 'release') {
    const list = src === 'cnb' ? await cnbGet(CNB_LIST_URL) : await ghGet(GH_LIST_URL);
    rel = latestStable(list);
  } else {
    const tag = `publish-${ch}`;
    rel = src === 'cnb' ? await cnbGet(CNB_TAG_URL(tag)) : await ghGet(GH_TAG_URL(tag));
  }

  return toRelease(rel, src, ch);
}

function latestStable(releases) {
  const list = (releases || [])
    .filter((r) => r && r.draft !== true && r.prerelease !== true)
    .map((r) => ({ r, m: STABLE_TAG.exec(String(r.tag_name || '')) }))
    .filter((x) => x.m)
    .sort((a, b) => cmpVersion(b.m, a.m));
  if (!list.length) throw new Error('未找到正式版发布');
  return list[0].r;
}

function cmpVersion(a, b) {
  for (let i = 1; i <= 3; i++) {
    const d = Number(a[i]) - Number(b[i]);
    if (d) return d;
  }
  return 0;
}

function toRelease(rel, source, channel) {
  const assets = (rel.assets || [])
    .filter((a) => a && a.name && a.browser_download_url)
    .map((a) => ({
      name: String(a.name),
      url: String(a.browser_download_url),
      size: Number(a.size || a.size_in_byte || 0),
      sha256: parseSha(a.digest, a.hash_algo, a.hash_value),
    }));
  return {
    source,
    channel,
    title: String(rel.name || rel.tag_name || '').trim(),
    tagName: String(rel.tag_name || ''),
    url: source === 'cnb'
      ? `https://cnb.cool/${CNB_REPO}/-/releases/tags/${encodeURIComponent(String(rel.tag_name || ''))}`
      : `https://github.com/${GH_REPO}/releases/tag/${encodeURIComponent(String(rel.tag_name || ''))}`,
    publishedAt: rel.published_at || rel.created_at || null,
    body: String(rel.body || '').trim(),
    assets,
  };
}

function parseSha(digest, algo, hash) {
  if (typeof digest === 'string' && digest.toLowerCase().startsWith('sha256:')) {
    const rest = digest.slice(7);
    if (rest.length === 64) return rest.toUpperCase();
  }
  if (String(algo || '').toLowerCase() === 'sha256' && hash) return String(hash).toUpperCase();
  return null;
}
