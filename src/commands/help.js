export const help = {
  names: ['help', '帮助'],
  description: '显示本菜单',
  async execute({ replyMarkdown, commands }) {
    const lines = [
      '# 可用指令',
      '',
      ...commands.flatMap((cmd) => {
        const name = `**${cmd.names.join(' / ')}**`;
        return cmd.description ? [name, `> ${cmd.description}`, ''] : [name, ''];
      }),
    ];
    await replyMarkdown(lines.join('\n'));
  },
};
