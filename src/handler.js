import { dispatch, showHelp, findCommand } from './commands/index.js';
import { stripPrefix } from './prefix.js';
import { isAdminSender } from './admin.js';

function escapeRe(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripMentions(content) {
  return (content || '')
    .replace(/<@!?[^>]*>\s*/g, '')
    .replace(/^@[^\s]+\s*/, '')
    .trim();
}

function isBotMentioned(msg, appId) {
  if (msg.rawEventType === 'GROUP_AT_MESSAGE_CREATE') return true;
  if (Array.isArray(msg.mentions) && msg.mentions.some((m) => m && m.is_you === true)) return true;
  if (appId && new RegExp(`<@!?${escapeRe(appId)}>`).test(msg.content || '')) return true;
  return false;
}

function isMentionish(msg) {
  if (msg.rawEventType === 'GROUP_AT_MESSAGE_CREATE') return true;
  if (Array.isArray(msg.mentions) && msg.mentions.length > 0) return true;
  return /<@|^@/.test(msg.content || '');
}

async function safeReply(bot, msg, content) {
  try {
    await bot.sendText(msg.replyTarget, content);
  } catch (err) {
    console.error('[handler] 回复失败：', err.message || err);
  }
}

export function createHandler(bot) {
  return async function handleMessage(_ctx, msg) {
    try {
      const rawContent = msg.content || '';
      const mentionish = isMentionish(msg);
      if (mentionish || msg.kind === 'c2c') {
        console.log(
          `[msg] ${msg.kind} sender=${msg.senderId} raw=${msg.rawEventType} mentions=${JSON.stringify(msg.mentions)} content="${rawContent}"`,
        );
      }
      const cleaned = stripMentions(rawContent);
      const mentioned = isBotMentioned(msg, bot.appId);

      const stripped = stripPrefix(cleaned);
      const hasPrefix = stripped !== null;
      const text = stripped ?? cleaned;

      // 群聊
      if (msg.kind === 'group') {
        // 已 @ 机器人：无指令返回帮助，有指令执行（未知指令也返回帮助）
        if (mentioned) {
          if (!text) return showHelp(bot, msg);
          return dispatch(bot, msg, text);
        }
        // 未 @ 机器人：带前缀或有指令才响应
        if (hasPrefix && text) return dispatch(bot, msg, text);
        // 管理员无需 @ / 前缀即可触发指令，但仅限命中已知指令，普通聊天保持沉默
        if (isAdminSender(msg) && findCommand(text)) return dispatch(bot, msg, text);
        // 既没 @ 也没触发指令：保持沉默
        return;
      }

      // 私聊：前缀可加可不加，直接当作指令处理
      if (!text) return showHelp(bot, msg);
      return dispatch(bot, msg, text);
    } catch (err) {
      console.error('[handler]', err.message || err);
      await safeReply(bot, msg, `出错了：${err.message || err}`);
    }
  };
}
