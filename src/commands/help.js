export const help = {
  names: ['help', '帮助'],
  description: '显示本菜单',
  async execute({ reply, commands }) {
    const lines = [
      '可用指令：',
      ...commands.map((cmd) =>
        cmd.description
          ? `  ${cmd.names.join('/')} - ${cmd.description}`
          : `  ${cmd.names.join('/')}`
      ),
      '',
      '群聊：@我 直接发送指令，前缀（. / \\）可加可不加',
      '群聊：不 @ 我时，需带前缀（. / \\）才会触发',
      '私聊：直接发送指令即可，前缀可加可不加',
    ];
    await reply(lines.join('\n'));
  },
};
