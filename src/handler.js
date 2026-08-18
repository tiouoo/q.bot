import { dispatch, showHelp } from './commands/index.js';
import { stripPrefix } from './prefix.js';

function escapeRe(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isBotMentioned(msg, appId) {
  if (msg.rawEventType === 'GROUP_AT_MESSAGE_CREATE') return true;
  if (Array.isArray(msg.mentions) && msg.mentions.some((m) => m && m.is_you === true)) return true;
  if (appId && new RegExp(`<@!?${escapeRe(appId)}>`).test(msg.content || '')) return true;
  return false;
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
      const cleaned = rawContent.replace(/<@!?\d+>\s*/g, '').trim();
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
        // 未 @ 机器人：只有带前缀且后面有指令内容才响应
        if (hasPrefix && text) return dispatch(bot, msg, text);
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
