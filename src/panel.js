const C2C_ITEMS = [
  { type: "command", name: "get", desc: "获取下载链接" },
  { type: "command", name: "log", desc: "获取更新日志" },
  { type: "command", name: "help", desc: "显示帮助列表" },
  { type: "command", name: "ping", desc: "连接状态/运行时间" },
];

const GROUP_ITEMS = [
  { type: 'command', name: 'get', desc: '获取下载链接' },
  { type: 'command', name: 'log', desc: '获取更新日志' },
  { type: 'command', name: 'help', desc: '显示帮助列表' },
  { type: 'command', name: 'ping', desc: '连接状态/运行时间' },
];

const PLANS = [
  { scope: 'c2c', remark: 'q.bot 单聊指令面板', items: C2C_ITEMS },
  { scope: 'group', remark: 'q.bot 群聊指令面板', items: GROUP_ITEMS },
];

function itemsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every(
    (it, i) =>
      it.type === b[i].type &&
      it.name === b[i].name &&
      (it.desc || '') === (b[i].desc || '') &&
      (it.link || '') === (b[i].link || '')
  );
}

export async function syncPanels(bot, log = console) {
  const out = typeof log === 'function' ? { info: log } : log;
  for (const plan of PLANS) {
    const data = await bot.api.get('/v2/panels', { scope: plan.scope, limit: 50 });
    const ours = (data.records || []).filter((r) => r.panel?.remark === plan.remark);
    const match = ours.find((r) => itemsEqual(r.panel?.items, plan.items));

    // 清理重复/过期面板
    for (const r of ours) {
      if (r !== match) {
        await bot.api.delete(`/v2/panels/${r.panel_id}`);
      }
    }

    if (match) {
      out.info(`[panel] ${plan.scope} 面板已是最新 ${match.panel_id}`);
      continue;
    }

    const created = await bot.api.post('/v2/panels', {
      scope: plan.scope,
      target_type: 'all',
      panel: { items: plan.items, remark: plan.remark },
    });
    out.info(`[panel] ${plan.scope} 面板已创建 ${created.panel_id}`);
  }
}
