export const help = {
  names: ['help', '帮助'],
  description: '显示本菜单',
  async execute({ replyMarkdown, commands }) {
    const visible = commands.filter((cmd) => !cmd.hidden);
    const lines = [
      '### 可用指令',
      '',
      ...visible.flatMap((cmd) => {
        const name = `${cmd.names.join(' / ')}`;
        return cmd.description ? [name, cmd.description, ''] : [name, ''];
      }),
      '提示：可用 . / 。 \\ 触发命令，如 /help'
    ];
    await replyMarkdown(lines.join('\n'));
  },
};
