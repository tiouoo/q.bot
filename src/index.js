import { QQBot, messageFilter } from '@tencent-connect/qqbot-nodejs';
import { config } from './config.js';
import { createHandler } from './handler.js';
import { status } from './status.js';

if (!config.appId || !config.appSecret) {
  console.error('[bot] 缺少 APP_ID / APP_SECRET，请检查 .env 文件');
  process.exit(1);
}

const logger = {
  info: (...args) => console.log('[bot]', ...args),
  error: (...args) => console.error('[bot]', ...args),
  warn: (...args) => console.warn('[bot]', ...args),
  debug: () => {},
};

// 群聊+私聊(1<<25) | 按钮互动(1<<26)
const INTENTS = (1 << 25) | (1 << 26);

const bot = new QQBot({
  appId: config.appId,
  appSecret: config.appSecret,
  markdownSupport: false,
  logger,
  intents: INTENTS,
});

bot.use(messageFilter({ skipSelfEcho: true, dedup: { windowMs: 5000 } }));

bot.on('ready', () => {
  status.connected = true;
  logger.info('机器人已上线');
});

bot.on('resumed', () => {
  status.connected = true;
  logger.info('机器人已重连');
});

bot.on('error', (err) => {
  status.connected = false;
  logger.error('机器人错误：', err.message || err);
});

bot.on('message', createHandler(bot));

bot.on('interaction', async (_ctx, event) => {
  try {
    await bot.acknowledgeInteraction(event.id, 0);
  } catch (err) {
    logger.error('[interaction] ack 失败：', err.message || err);
  }
});

const ac = new AbortController();
process.on('SIGINT', () => ac.abort());
process.on('SIGTERM', () => ac.abort());

try {
  await bot.start(ac.signal);
  logger.info('机器人已停止');
} catch (err) {
  logger.error('启动失败：', err.message || err);
  process.exit(1);
}
