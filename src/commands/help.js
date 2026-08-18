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
    ];
    await reply(lines.join('\n'));
  },
};
