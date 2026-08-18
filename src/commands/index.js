import { help } from './help.js';
import { ping } from './ping.js';
import { download } from './download.js';
import { changelog } from './changelog.js';

export const commands = [ping, help, download, changelog];

export function buildContext(bot, msg, args) {
  return {
    bot,
    msg,
    commands,
    args,
    reply: (content) => bot.sendText(msg.replyTarget, content),
    replyMarkdown: (content) => bot.sendMarkdown(msg.replyTarget, content),
  };
}

export async function dispatch(bot, msg, text) {
  const parts = (text || '').split(/\s+/).filter(Boolean);
  const name = (parts[0] || '').toLowerCase();
  const command = commands.find((cmd) => cmd.names.includes(name)) || help;
  await command.execute(buildContext(bot, msg, parts.slice(1)));
}

export async function showHelp(bot, msg) {
  await help.execute(buildContext(bot, msg, []));
}
