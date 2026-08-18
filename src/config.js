import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

function stripQuotes(value) {
  return String(value || '').trim().replace(/^['"]+|['"]+$/g, '');
}

export const config = {
  appId: stripQuotes(process.env.APP_ID),
  appSecret: stripQuotes(process.env.APP_SECRET),
  cnbToken: stripQuotes(process.env.CNB_TOKEN) || stripQuotes(process.env.CNB_UPDATE_TOKEN) || '',
  githubProxy: stripQuotes(process.env.GITHUB_PROXY) || 'http://127.0.0.1:7890',
  hideAssets: (process.env.HIDE_ASSETS || '')
    .split(',')
    .map((s) => stripQuotes(s))
    .filter(Boolean),
};
