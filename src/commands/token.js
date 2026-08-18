import {
  getTokenProfile,
  todayInShanghai,
  findContribution,
  formatTokens,
  formatCost,
  formatDateCN,
} from '../services/tokens.js';

export const token = {
  names: ['token', '用量'],
  description: 'Token 用量统计',
  hidden: true,
  async execute({ reply, replyMarkdown }) {
    try {
      const data = await getTokenProfile();
      await replyMarkdown(buildMarkdown(data));
    } catch (err) {
      await reply(`Token 用量获取失败：${err.message || err}`);
    }
  },
};

function buildMarkdown(data) {
  const stats = data.stats || {};
  const user = data.user || {};
  const contributions = data.contributions || [];
  const today = todayInShanghai();
  const todayC = findContribution(contributions, today);
  const lastC = contributions[contributions.length - 1];

  const todayLine = todayC
    ? `${formatTokens(todayC.totals?.tokens)} tokens · ${formatCost(todayC.totals?.cost)} · ${todayC.totals?.messages ?? 0} 条消息`
    : '今日暂无记录';

  const topModels = (data.modelUsage || [])
    .filter((m) => m && m.percentage > 0.5)
    .slice(0, 3)
    .map((m) => `${m.model} ${m.percentage.toFixed(1)}%`)
    .join(' · ');

  const lines = [
    `# Token 用量 · ${user.username || 'tiouoo'}`,
    '',
    '**总量**',
    `${formatTokens(stats.totalTokens)} tokens · ${formatCost(stats.totalCost)}`,
    '',
    `**今日 (${today})**`,
    todayLine,
    '',
    '**构成**',
    `输入 ${formatTokens(stats.inputTokens)} · 输出 ${formatTokens(stats.outputTokens)}`,
    `缓存读 ${formatTokens(stats.cacheReadTokens)} · 缓存写 ${formatTokens(stats.cacheWriteTokens)} · 推理 ${formatTokens(stats.reasoningTokens)}`,
    '',
    '**活跃**',
    `${stats.activeDays ?? 0} 天 · ${stats.sessionCount ?? 0} 会话 · ${stats.submissionCount ?? 0} 次上报`,
    '',
  ];
  if (topModels) {
    lines.push('**Top 模型**', topModels, '');
  }
  if (lastC) {
    lines.push(`**最近记录 (${lastC.date})**`, `${formatTokens(lastC.totals?.tokens)} tokens · ${formatCost(lastC.totals?.cost)}`, '');
  }
  lines.push('**数据更新**', formatDateCN(data.updatedAt));
  return lines.join('\n');
}
